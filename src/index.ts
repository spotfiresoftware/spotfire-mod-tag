import { DataView, DataViewRow } from "spotfire-api";
import * as d3 from "d3";

interface Tag {
    name: string;
    tagColors: Map<string, TagColor>;
}

interface TagColor {
    name: string;
    colorValue: string;
    rows: DataViewRow[];
    markedCount: number;
    color?: string;
    markedColor?: string;
}

const Spotfire = window.Spotfire;

const DEBUG = false;

const tagAxisName = "Tags";
const colorAxisName = "Color";

const modContainer = d3.select("#mod-container");

Spotfire.initialize(async (mod) => {
    /**
     * Initialize render context - should show 'busy' cursor.
     * A necessary step for printing (another step is calling render complete)
     */
    const context = mod.getRenderContext();

    // Set font style from context
    document.querySelector("#extra_styling")!.innerHTML = `
        .body { 
            font-size: ${context.styling.general.font.fontSize}px; 
            font-weight: ${context.styling.general.font.fontWeight}; 
            font-style: ${context.styling.general.font.fontStyle};
        }
        `;

    const reader = mod.createReader(mod.visualization.data(), mod.windowSize());

    reader.subscribe(generalErrorHandler(mod)(onChange), (err) => {
        mod.controls.errorOverlay.show(err);
    });

    async function onChange(dataView: DataView, windowSize: Spotfire.Size) {
        // Clear content
        modContainer.selectAll("*").remove();

        // Validate the tag axis has been configured
        const hasTags = !!(await dataView.categoricalAxis(tagAxisName));
        if(hasTags == false) {
            modContainer.append("div")
                .attr("class", "no-tags")
                .text("No available values");
            return;
        }

        // Get all data rows
        let rows = (await dataView.allRows()) || [];

        let tags = new Map();
        let markedCount = 0;
        let colorContinuousAxis = await dataView.continuousAxis(colorAxisName);
        let colorCategoricalAxis = await dataView.categoricalAxis(colorAxisName);

        rows.forEach((row: DataViewRow) => {
            let tagValue = row.categorical(tagAxisName).formattedValue();
            
            let tagColorValue = "default";
            if(colorContinuousAxis)
                tagColorValue = row.continuous(colorAxisName).formattedValue();
            else if(colorCategoricalAxis)
                tagColorValue = row.categorical(colorAxisName).formattedValue();

            let tagNames = tagValue.split(",").map((name) => name.trim());
            let color = row.color().hexCode;

            tagNames.forEach((tagName) => {
                // If tag not found, create it
                let tag;
                if(tags.has(tagName) == false) {
                    tag = {
                        name: tagName,
                        tagColors: new Map<string, TagColor>()
                    } as Tag;
                    tags.set(tagName, tag);
                } 
                // Otherwise retrieve existing tag
                else {
                    tag = tags.get(tagName);
                }

                // If tag color not found, create it
                let tagColor;
                if(tag.tagColors.has(tagColorValue) == false) {
                    tagColor = {
                        name: tagName,
                        colorValue: tagColorValue,
                        rows: [],
                        markedCount: 0
                    } as TagColor;
                    tag.tagColors.set(tagColorValue, tagColor);
                }
                else {
                    tagColor = tag.tagColors.get(tagColorValue);
                }

                tagColor.rows.push(row);
                tagColor.markedCount += row.isMarked() ? 1 : 0;
                
                if(row.isMarked() == false && tagColor.color == null)
                    tagColor.color = color;
                if(row.isMarked() && tagColor.markedColor == null)
                    tagColor.markedColor = color;

                // Increment overall marked count
                if(row.isMarked())
                    markedCount++;
            });
        });

        // Sort the tags alphabetically
        let tagArray: TagColor[] = Array.from(tags.values()).reduce((acc: TagColor[], tag: Tag) => acc.concat(Array.from(tag.tagColors.values())), [])
            .sort((a: TagColor, b: TagColor) => {
                if(a.name.localeCompare(b.name) == 0)
                    return a.colorValue.localeCompare(b.colorValue);
                return a.name.localeCompare(b.name);
            });

        // Set marked class if there are any marked tags
        modContainer.classed("marked", markedCount > 0);

        // Get the tag color from the tag object, falling back to a default color
        function getTagColor(tag: TagColor): string {
            return (tag.markedCount > 0 ? tag.markedColor : tag.color) ?? "#f2f5fc";
        }

        // Get the text color for the tag based on its background color
        function getTagTextColor(tag: TagColor): string {
            const tagColor = getTagColor(tag);
            const colorIsLight = hexIsLight(tagColor);
            const markedState = tag.markedCount == 0 ? 'none' : tag.markedCount == tag.rows.length ? 'all' : 'some';
            const baseTextColor = colorIsLight ? "#61646B" : "#FFFFFF";
            const alpha = colorIsLight ? '66' : '88';

            if(markedCount > 0) {
                if(markedState == 'all')
                    return baseTextColor;
                else if(markedState == 'some')
                    return baseTextColor + alpha;
                else if(markedState == 'none')
                    return baseTextColor + alpha;
            }
            return baseTextColor;
        }

        // Get the tag marked state 
        function getTagClasses(tag: TagColor): string {
            if(tag.markedCount == 0)
                return "tag unmarked";

            if(tag.markedCount == tag.rows.length)
                return "tag marked all-marked";
            return "tag marked some-marked";
        }

        // Click event handler for the tag container
        function click(event:MouseEvent, tag: TagColor) {
            tag.rows.forEach((row: DataViewRow) => {
                row.mark(event.ctrlKey || event.metaKey ? "ToggleOrAdd" : "Replace");
                event.stopPropagation();
            });
        }

        // Append tags to the container
        modContainer
            .selectAll("tags")
            .data(tagArray)
                .enter()
                    .append("div")
                        .attr("class", "tag-background")
                        .style("background-color", context.styling.general.backgroundColor)
                        .on("click", click)
                    .append("div")
                        .attr("class", (tag: TagColor) => getTagClasses(tag))
                        .style("background-color", (tag: TagColor) => getTagColor(tag))
                        .style("color", (tag: TagColor) => getTagTextColor(tag))
                        .text((tag: TagColor) => tag.name);

        
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

// Color functions
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
