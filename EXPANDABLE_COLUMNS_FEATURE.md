# Expandable Columns Feature

## Overview
The diff checker now supports expandable columns that allow users to view either the source data, target data, or both in a split view. This feature is available across all comparison sections.

## Features

### View Mode Toggle Buttons
Three buttons are now available at the top of each comparison section:

1. **📄 Source Only** - Shows only the source (left) data in full width
2. **⚖️ Split View** - Shows both source and target data side by side (default)
3. **📄 Target Only** - Shows only the target (right) data in full width

### Supported Sections
The expandable columns feature works with all comparison sections:

- Query Plan
- PDS Dataset Paths  
- VDS Dataset Paths
- VDS Details with SQL
- Plan Operators
- Reflections
- Data Scans

### Implementation Details

#### DiffViewer Component
- Added `ViewMode` type with three options: `'split' | 'source-only' | 'target-only'`
- Added state management for view mode with `useState<ViewMode>('split')`
- Added `renderViewModeToggle()` function to display the toggle buttons
- Added `renderSingleColumn()` function for single column display
- Updated all rendering logic to conditionally show content based on view mode

#### DataScanComparison Component
- Added `viewMode` prop to accept parent view mode
- Updated data processing to only include relevant data based on view mode
- Added title display for single column views
- Maintained internal view mode for table organization (all scans vs by table)

### User Experience
- **Split View**: Traditional side-by-side comparison with diff highlighting
- **Source Only**: Clean, full-width view of source data with syntax highlighting
- **Target Only**: Clean, full-width view of target data with syntax highlighting
- **Responsive**: Buttons are clearly labeled with icons and maintain active state styling

### Technical Benefits
- Improved readability for large datasets
- Better focus on individual data sources
- Maintains all existing diff functionality
- Consistent UI across all comparison types
- No breaking changes to existing functionality

## Usage
1. Upload query profile files as usual
2. Select the section you want to compare
3. Use the view mode toggle buttons to switch between:
   - Source Only (left column expanded)
   - Split View (default side-by-side)
   - Target Only (right column expanded)

The view mode persists across different sections until manually changed. 