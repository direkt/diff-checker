# Query Profile Diff Checker

A Next.js application for comparing and analyzing Dremio query profile JSON files. Upload query profiles to visualize differences in execution plans, dataset paths, operators, and performance metrics.

## Features

- **Side-by-side comparison** of query profiles
- **Expandable columns** - View source only, target only, or split view
- **Multiple comparison sections**:
  - Query Plans with operator-level analysis
  - PDS and VDS Dataset Paths
  - VDS Details with SQL syntax highlighting
  - Plan Operators with detailed breakdowns
  - Reflections (chosen and considered)
  - Data Scans with filtering capabilities
- **Word-level diff highlighting** for precise change detection
- **Folder-based uploads** for batch processing
- **Interactive filtering** and search capabilities
- **Section Reordering & Pinning** - Reorder comparison sections and pin favorites to keep them visible while scrolling

## New: Expandable Columns Feature

Each comparison section now includes view mode toggle buttons:

- **📄 Source Only** - Full-width view of source data
- **⚖️ Split View** - Traditional side-by-side comparison (default)
- **📄 Target Only** - Full-width view of target data

This feature improves readability for large datasets and allows focused analysis of individual query profiles.

## Getting Started

First, run the development server:

```bash
brew install pnpm

pnpm install

pnpm run dev

```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. **Upload Files**: Use the file uploader to select folders containing query profile JSON files
2. **Select Queries**: Choose source and target query profiles from the dropdowns
3. **Choose Section**: Select which aspect of the profiles to compare
4. **View Mode**: Toggle between source-only, split, or target-only views
5. **Analyze**: Review differences with syntax highlighting and detailed breakdowns

## Technical Stack

- **Next.js 15** with App Router
- **React 18** with TypeScript
- **Tailwind CSS** for styling
- **React Diff Viewer** for comparison visualization
- **JSZip** for file processing
- **Syntax highlighting** for SQL and JSON content


