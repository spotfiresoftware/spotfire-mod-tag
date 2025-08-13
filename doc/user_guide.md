This mod for Spotfire® can be used to display a set of selectable tags that can be used to query a dataset based on keywords.

![Tag Mod](../assets/tag.png)

Each tag represents a unique comma separated value in a column. Selecting a tag will mark all rows where the corresponding value occurs. This marking can then be used to limit the data displayed in other visualizations.

# Try this mod in Spotfire® Analyst

## How to open the mod

1. Open Spotfire® Analyst, and create an analysis by loading some data.
1. Drag the mod file into the analysis.
1. The visualization mod is added to the analysis.
1. To learn about the capabilities and limitations of this visualization mod, keep reading.

For general information on how to use and share visualization mods, read the Spotfire documentation.

# Data requirements

**Every mod handles missing, corrupted and/or inconsistent data in different ways. It is advised to always review how the data is visualized.**

This visualization can be used to display tags in any data set with at least one categorical column.

# Setup

Let's say we have data about the people and their pets:

| Name   | Pet             | Area  |
| ------ | --------------- | ----- |
| Franck | Dog             | South |
| Joe    | Dog, Cat        | East  |
| Oliver | Cat,Dog         | East  |
| Anna   | Dog, Cat        | North |
| Brie   | Dog, Cat, Mouse | North |
| Paula  | Cat, Mouse      | East  |
| Eric   | Cat             | South |
| Jean   | Cat, Budgie     | South |
| Bob    | Iguana          | North |

A basic tag visualization can be configured to show one tag per Pet with the following settings:
* Tags = Pet

The resulting tag list will look like this:

![Sample](../assets/sample.png)

# Configuration

The visualization can be configured by setting the tag axis.

# Usage

## Color

The mod supports coloring tags. If the Color by axis is not specified a default color will be applied. This can be customized in the Colors configuration.

The Color by axis expression may be either continuous or categorical. If specified, then a tag for each tag value-color combination will be created. For example, if Color by is set to Area from the dataset above, and there are "Cat" rows in 3 areas, then 3 "Cat" tags will be displayed, one of each color. Only 1 "Iguana" tag is created, because it exists only in one area.

![Coloring](../assets/color-by.png)

Because the Tags axis supports comma-separated values, it is not possible to color by individual tag values or categories when there are multiple tags per row. Instead, each tag should be separated into a single row per tag, which would then permit coloring by tag value or category. 

Continuous Color by expressions may also not work as expected with comma-separated tag values.

## Marking

Clicking on a tag will mark all rows with that tag in all other visualizations that uses the same marking. You can mark several tags by Ctrl-clicking on them. Clicking outside the tags will unmark all rows.

Because each row can have multiple tags, the marking display will vary depending if all corresponding rows are marked, or only some of them.

![Marking](../assets/marking.png)

* Tags with any marked rows will have a darker background color than tags with no marked rows.
* Tags with no marked rows or some marked rows will have a text color partially blended into the background color
* Tags with all marked rows will have a full text color contrasting with the background color

Clicking a specific tag may result in other tags displaying as fully or partially marked depending on the underlying data. 

For example, starting with no marking, and the user clicks the "Cat" tag: 

![Marking](../assets/marking-cat.png)

* All rows of "Cat" are marked
* All rows of "Budgie" are marked because all "Budgie" rows are also "Cat" rows
* All rows of "Mouse" are marked because all "Mouse" rows are also "Cat" rows
* Some rows of "Dog" are marked that are also "Cat" rows, but not the remaining "Dog" rows
* No rows of "Iguana" are marked because no rows are also "Cat"

# Help and support

**This mod is not supported by Spotfire® Support.**

In the event of issues, to request help, or suggest enhancements, please post a topic in the Spotfire® forum on [Spotfire® Community](https://community.spotfire.com/forums/forum/18-spotfire/) and tag with **Mods**.

# More information about Spotfire® mods

- [Spotfire® Visualization Mods on the Spotfire® Community Exchange](https://community.spotfire.com/files/category/7-visualization-mods/): A safe and trusted place to discover ready-to-use Mods
- [Spotfire® Mods Developer Documentation](https://spotfiresoftware.github.io/spotfire-mods/docs/): Introduction and tutorials for Mods Developers
- [Mods by Spotfire®](https://github.com/spotfiresoftware/spotfire-mods/releases/latest): A public repository for example projects

Copyright (c) 2023-2025 Cloud Software Group, Inc. All Rights Reserved