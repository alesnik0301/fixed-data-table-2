/**
 * Copyright Schrodinger, LLC
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule columnWidths
 */
import { getTotalFlexGrow, getTotalWidth } from 'widthHelper';
import Scrollbar from 'Scrollbar';
import forEach from 'lodash/forEach';
import map from 'lodash/map';
import scrollbarsVisible from 'scrollbarsVisible';
import shallowEqualSelector from 'shallowEqualSelector';

/**
 * @typedef {{
 *   fixed: boolean,
 *   fixedRight: boolean,
 *   flexGrow: number,
 *   width: number,
 * }}
 */
let columnDefinition;

/**
 * @param {!Array.<columnDefinition>} columnGroupProps
 * @param {!Array.<columnDefinition>} columnProps
 * @param {boolean} scrollEnabledY
 * @param {number} width
 * @return {{
 *   columnGroupProps: !Array.<columnDefinition>,
 *   columnProps: !Array.<columnDefinition>,
 *   availableScrollWidth: number,
 *   fixedColumns: !Array.<columnDefinition>,
 *   fixedRightColumns: !Array.<columnDefinition>,
 *   scrollableColumns: !Array.<columnDefinition>,
 *   maxScrollX: number,
 * }} The total width of all columns.
 */
function columnWidths(columnGroupProps, columnProps, scrollEnabledY, width) {
  const scrollbarSpace = scrollEnabledY ? Scrollbar.SIZE + Scrollbar.OFFSET : 0;
  const viewportWidth = width - scrollbarSpace;

  const {
    newColumnGroupProps,
    newColumnProps,
  } = flexWidths(columnGroupProps, columnProps, viewportWidth);

  const {
    fixedColumns,
    fixedRightColumns,
    scrollableColumns,
    scrollableColumnGroups,
    scrollableColumnGroupIndex,
    columnGroupIndex,
  } = groupColumns(newColumnProps, newColumnGroupProps);

  const availableScrollWidth = Math.max(viewportWidth - getTotalWidth(fixedColumns) - getTotalWidth(fixedRightColumns), 0);
  const maxScrollX = Math.max(0, getTotalWidth(newColumnProps) - viewportWidth);
  return {
    columnGroupIndex,
    columnGroupProps: newColumnGroupProps,
    columnProps: newColumnProps,
    availableScrollWidth,
    fixedColumns,
    fixedRightColumns,
    scrollableColumns,
    scrollableColumnGroups,
    scrollableColumnGroupIndex,
    maxScrollX,
  };
}

/**
 * @param {!Array.<columnDefinition>} columnGroupProps
 * @param {!Array.<columnDefinition>} columnProps
 * @param {number} viewportWidth
 * @return {{
 *   newColumnGroupProps: !Array.<columnDefinition>,
 *   newColumnProps: !Array.<columnDefinition>
 * }}
 */
function flexWidths(columnGroupProps, columnProps, viewportWidth) {
  let newColumnProps = columnProps;
  let remainingFlexGrow = getTotalFlexGrow(columnProps);

  // if any column is a flex column, we'll need to calculate the widths for every column
  if (remainingFlexGrow !== 0) {
    const columnsWidth = getTotalWidth(columnProps);
    let remainingFlexWidth = Math.max(viewportWidth - columnsWidth, 0);

    // calculate and set width for each column
    newColumnProps = map(columnProps, column => {
      const { flexGrow } = column;

      // if no flexGrow is specified, column defaults to original width
      if (!flexGrow) {
        return column;
      }

      const flexWidth = Math.floor(flexGrow * remainingFlexWidth / remainingFlexGrow);
      const newWidth = column.width + flexWidth;
      remainingFlexGrow -= flexGrow;
      remainingFlexWidth -= flexWidth;

      return Object.assign({}, column, { width: newWidth });
    });
  }

  // calculate width for each column group
  const columnGroupWidths = map(columnGroupProps, () => 0);
  forEach(newColumnProps, column => {
    if (column.groupIdx !== undefined) {
      columnGroupWidths[column.groupIdx] += column.width;
    }
  });

  // set the width for each column group
  const newColumnGroupProps = map(columnGroupProps, (columnGroup, idx) => {
    if (columnGroupWidths[idx] === columnGroup.width) {
      return columnGroup;
    }
    return Object.assign({}, columnGroup, { width: columnGroupWidths[idx] });
  });

  return {
    newColumnGroupProps,
    newColumnProps,
  };
}

/**
 * @param {!Array.<columnDefinition>} columnProps
 * @param {!Array.<columnDefinition>} columnGroupProps
 * @return {{
 *   columnGroupIndex: !Array.<number>,
 *   fixedColumns: !Array.<columnDefinition>,
 *   fixedRightColumns: !Array.<columnDefinition>,
 *   scrollableColumns: !Array.<columnDefinition>,
 *   scrollableColumnGroupIndex: !Array.<number>,
 *   scrollableColumnGroups: !Array.<columnDefinition>,
 * }}
 */
function groupColumns(columnProps, columnGroupProps) {
  const fixedColumns = [];
  const fixedRightColumns = [];
  const scrollableColumns = [];
  const scrollableColumnGroups = [];
  const columnGroupIndex = [];
  const scrollableColumnGroupIndex = [];

  forEach(columnProps, columnProp => {
    let container = scrollableColumns;
    if (columnProp.fixed) {
      container = fixedColumns;
    } else if (columnProp.fixedRight) {
      container = fixedRightColumns;
    }
    container.push(columnProp);
  });

  // group the scrollable column groups together and also provide
  // index mapping (and inverse mapping) from the column group to it's order in the view
  forEach(columnGroupProps, (columnProp, index) => {
    if (!columnProp.fixed && !columnProp.fixedRight) {
      scrollableColumnGroupIndex.push(index); // index of scrollable group in columnGroupProps
      columnGroupIndex[index] = scrollableColumnGroups.length; // index of column group in scrollableColumnGroups
      scrollableColumnGroups.push(columnProp);
    }
  });

  return {
    fixedColumns,
    fixedRightColumns,
    scrollableColumns,
    scrollableColumnGroups,
    columnGroupIndex,
    scrollableColumnGroupIndex,
  };
}

export default shallowEqualSelector([
  state => state.columnGroupProps,
  state => state.columnProps,
  state => scrollbarsVisible(state).scrollEnabledY,
  state => state.tableSize.width,
], columnWidths);
