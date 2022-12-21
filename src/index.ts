import { DataView, DataViewRow } from "spotfire-api";
import * as d3 from "d3";

interface Tag {
    name: string;
    rows: DataViewRow[];
    isMarked: boolean;
}

const Spotfire = window.Spotfire;

const DEBUG = false;

const tagAxisName = "Tags";

const modContainer = d3.select("#mod-container");

Spotfire.initialize(async (mod) => {
    /**
     * Initialize render context - should show 'busy' cursor.
     * A necessary step for printing (another step is calling render complete)
     */
    const context = mod.getRenderContext();

    const reader = mod.createReader(mod.visualization.data(), mod.windowSize());

    reader.subscribe(generalErrorHandler(mod)(onChange), (err) => {
        mod.controls.errorOverlay.show(err);
    });

    async function onChange(dataView: DataView, windowSize: Spotfire.Size) {
        /**
         * Set font-style from canvas
         */
        document.querySelector("#extra_styling")!.innerHTML = `
        .body { 
            font-size: ${context.styling.general.font.fontSize}px; 
            font-weight: ${context.styling.general.font.fontWeight}; 
            font-style: ${context.styling.general.font.fontStyle};
        }
        `;

        /**
         * Validate axis configuration
         */
        const hasTags = !!(await dataView.categoricalAxis(tagAxisName));
        if (!hasTags) {
            modContainer.selectAll("*").remove();
            return;
        }

        /**
         * Extract tags from comma separated keywords in the selected column
         */
        let rows = (await dataView.allRows()) || [];

        let tags = new Map();

        rows.forEach((row: DataViewRow) => {
            let tagValue = row.categorical(tagAxisName).formattedValue();
            let tagNames = tagValue.split(",").map((name) => name.trim());
            tagNames.forEach((tagName) => {
                if (!tags.has(tagName)) {
                    let tag: Tag = {
                        name: tagName,
                        rows: [row],
                        isMarked: row.isMarked()
                    };
                    tags.set(tagName, tag);
                } else {
                    let tag = tags.get(tagName);
                    tag.rows.push(row);
                    if (!row.isMarked()) {
                        tag.isMarked = false; // tag should only be marked if all corresponding rows are marked
                    }
                }
            });
        });

        let tagArray: Tag[] = Array.from(tags.values()).sort();

        /**
         * Update the tag display
         */
        modContainer
            .selectAll("div")
            .data(tagArray)
            .join("div")
            .attr("class", "tag")
            .text((tag: Tag) => tag.name)
            .classed("markedTag", (tag: Tag) => tag.isMarked)
            .on("click", (event:MouseEvent, tag: Tag) =>
                tag.rows.forEach((row: DataViewRow) => {
                    row.mark(event.ctrlKey || event.metaKey ? "ToggleOrAdd" : "Replace");
                    event.stopPropagation();
                }
                )
            );

        d3.select("body").on("click", (element) => {dataView.clearMarking()});
        
        context.signalRenderComplete();
    }
});

/**
 * subscribe callback wrapper with general error handling, row count check and an early return when the data has become invalid while fetching it.
 *
 * The only requirement is that the dataview is the first argument.
 * @param mod - The mod API, used to show error messages.
 * @param rowLimit - Optional row limit.
 */
export function generalErrorHandler<T extends (dataView: Spotfire.DataView, ...args: any) => any>(
    mod: Spotfire.Mod,
    rowLimit = 2000
): (a: T) => T {
    return function (callback: T) {
        return async function callbackWrapper(dataView: Spotfire.DataView, ...args: any) {
            try {
                const errors = await dataView.getErrors();
                if (errors.length > 0) {
                    mod.controls.errorOverlay.show(errors, "DataView");
                    return;
                }
                mod.controls.errorOverlay.hide("DataView");

                /**
                 * Hard abort if row count exceeds an arbitrary selected limit
                 */
                const rowCount = await dataView.rowCount();
                if (rowCount && rowCount > rowLimit) {
                    mod.controls.errorOverlay.show(
                        `☹️ Cannot render - too many rows (rowCount: ${rowCount}, limit: ${rowLimit}) `,
                        "General"
                    );
                    return;
                }

                /**
                 * User interaction while rows were fetched. Return early and respond to next subscribe callback.
                 */
                const allRows = await dataView.allRows();
                if (allRows == null) {
                    return;
                }

                await callback(dataView, ...args);

                mod.controls.errorOverlay.hide("General");
            } catch (e) {
                if (e instanceof Error) {
                    mod.controls.errorOverlay.show(e.message, "General");

                    if (DEBUG) {
                        throw e;
                    }
                }
            }
        } as T;
    };
}
