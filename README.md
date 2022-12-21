# Tag Visualization Mod for TIBCO Spotfire®

The Tag Visualization Mod displays a set of selectable tags that can be used to query a dataset based on keywords.

<img width="1366" alt="Tags Screenshot" src="screenshots/Continents.png">

Each tag represents a unique comma separated value in a column. Selecting a tag will mark all rows where the corresponding value occurs. This marking can then be used to limit the data displayed in other visualizations.

## Try this mod in TIBCO Spotfire® Analyst

### How to open the mod

1. Open Spotfire® Analyst, and create and analysis by loading some data.
2. Unzip the downloaded file, and locate the .mod file in the unzipped folder.
3. Drag the file into the analysis.
4. The visualization mod is added to the analysis.
5. To learn more about the capabilities and limitations of this visualization mod, keep reading or see the User Guide which is also located in the downloaded folder.
6. For general information on how to use and share visualization mods, you can read the Spotfire documentation.

## Data requirement

The tag visualization mod can be used to display tags in any data set with at least one categorical column.

Note that every mod handles missing, corrupted and/or inconsistent data in different ways. It is advised to always review how the data is visualized.

## Setting up the Tag Visualization

Let's say we have data about the people and their pets:

| Name   | Pet             |
| ------ | --------------- |
| Frank  | Dog             |
| Joe    | Dog, Cat        |
| Oliver | Cat,Dog         |
| Anna   | Dog, Cat        |
| Brie   | Dog, Cat, Mouse |
| Paula  | Cat, Mouse      |
| Eric   | Cat             |
| Jean   | Cat             |

A basic tag visualization can be configured to show one tag per Pet with the following settings:

-   Tags = Pet

The resulting tag list will look like this:

<img alt="Tags Screenshot" src="screenshots/Pets.png">

## Configuring the Tag Visualization

The Tag Visualization can be configured by setting the tag axis.

## Using the Tag Visualization

### Marking

Clicking on a tag will mark all rows with the corresponding key value in all other visualizations that uses the same marking. You can mark several tags by Ctrl-clicking on them.

Tags are marked when all rows corresponding to that tag is marked.

Clicking outside the tags will unmark all rows. 

## Version History

### 1.0

-   First version

### 1.1

- Clicking outside the tags will unmark all rows

## Developing the Tag Visualization

Build Project

In a terminal window:

-   `npm install`
-   `npm run build-watch`

In a new terminal window

-   `npm run server`
