import { DataView, DataViewRow } from "spotfire-api";
import * as d3 from "d3";

interface Tag {
    name: string;
    rows: DataViewRow[];
    markedCount: number;
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
        let markedCount = 0;

        rows.forEach((row: DataViewRow) => {
            let tagValue = row.categorical(tagAxisName).formattedValue();
            let tagNames = tagValue.split(",").map((name) => name.trim());

            tagNames.forEach((tagName) => {
                // If tag not found, create it
                if(!tags.has(tagName)) {
                    let tag: Tag = {
                        name: tagName,
                        rows: [row],
                        markedCount: row.isMarked() ? 1 : 0
                    };
                    tags.set(tagName, tag);
                } 
                // Otherwise add row to existing tag
                else {
                    let tag = tags.get(tagName);
                    tag.rows.push(row);
                    tag.markedCount += row.isMarked() ? 1 : 0;
                }

                // Increment overall marked count
                if(row.isMarked()) {
                    markedCount++;
                }
            });
        });

        // Sort the tags alphabetically
        let tagArray: Tag[] = Array.from(tags.values()).sort();

        // Clear existing tags
        modContainer.selectAll("*").remove();

        // Set marked class if there are any marked tags
        modContainer.classed("marked", markedCount > 0);

        // Append tags to the container
        modContainer
            .selectAll("tags")
            .data(tagArray)
                .enter()
                    .append("div")
                        .attr("class", "tag-background")
                        .style("background-color", context.styling.general.backgroundColor)
                        .on("click", (event:MouseEvent, tag: Tag) =>
                            tag.rows.forEach((row: DataViewRow) => {
                                    row.mark(event.ctrlKey || event.metaKey ? "ToggleOrAdd" : "Replace");
                                    event.stopPropagation();
                                }
                            )
                        )
                    .append("div")
                        .attr("class", "tag")
                        .classed("marked", (tag: Tag) => tag.markedCount > 0)
                        .classed("all-marked", (tag: Tag) => tag.markedCount > 0 && tag.rows.length === tag.markedCount)
                        .classed("some-marked", (tag: Tag) => tag.markedCount > 0 && tag.rows.length > tag.markedCount)
                        .text((tag: Tag) => tag.name);

        
        // Clear marking on body click
        d3.select("body").on("click", (element) => {dataView.clearMarking()});
        
        // Signal render complete
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

export function hexToRgb(hexColorStr: string): { r: number; g: number; b: number; a?: number } {
    const r = parseInt(hexColorStr.slice(1, 3), 16);
    const g = parseInt(hexColorStr.slice(3, 5), 16);
    const b = parseInt(hexColorStr.slice(5, 7), 16);
    const a = parseInt(hexColorStr.slice(7, 9), 16) / 255;

    const rgba: { r: number; g: number; b: number; a?: number } = { r: r, g: g, b: b };
    if (!isNaN(a)) {
        rgba.a = a;
    }
    return rgba;
}

export function hexIsLight(hexColorStr: string): boolean {
    const rgb = hexToRgb(hexColorStr);
    return rgbIsLight(rgb.r, rgb.g, rgb.b);
}

export function rgbIsLight(r: number, g: number, b: number) {
    let luma = 0.2126 * r + 0.7152 * g + 0.0722 * b; // per ITU-R BT.709
    return luma > 160;
}
