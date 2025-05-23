import React, { useState } from 'react';
import { ProfileData } from '@/utils/jqUtils';

interface DataScan {
  profileId: string;
  tableName: string;
  scanType: string;
  filters: string[];
  filterExpression?: string;
  timestamp: string;
  metrics: {
    rowsScanned: number;
    duration: number;
  };
}

interface DataScanComparisonProps {
  leftData: ProfileData | null;
  rightData: ProfileData | null;
  viewMode?: 'split' | 'source-only' | 'target-only';
}

const DataScanComparison: React.FC<DataScanComparisonProps> = ({ leftData, rightData, viewMode: parentViewMode = 'split' }) => {
  const [internalViewMode, setInternalViewMode] = useState<'all' | 'byTable'>('all');
  const [selectedScanTypes, setSelectedScanTypes] = useState<string[]>([]);
  const [rowsScannedFilter, setRowsScannedFilter] = useState<string>('any');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilterPattern, setSelectedFilterPattern] = useState<string>('');

  // Process data from ProfileData into DataScan objects
  const scans = React.useMemo(() => {
    const result: DataScan[] = [];
    
    // Helper function to extract the full filter expression from plan
    const extractFilterExpression = (plan: string, tableName: string): string | undefined => {
      if (!plan) return undefined;
      
      // Look for TableFunction with the specific table name
      const regex = new RegExp(`TableFunction\\(filters=\\[\\[.*?\\]\\].*?table=${tableName}`, 'g');
      const matches = plan.match(regex);
      
      if (matches && matches.length > 0) {
        // Extract the full filter expression
        const filterRegex = /TableFunction\(filters=\[\[(.*?)\]\]/;
        const filterMatch = matches[0].match(filterRegex);
        return filterMatch ? filterMatch[1] : undefined;
      }
      
      return undefined;
    };

    // Only process left data if we're showing source-only or split view
    if ((parentViewMode === 'source-only' || parentViewMode === 'split') && leftData?.dataScans) {
      leftData.dataScans.forEach(scan => {
        result.push({
          profileId: 'Source',
          tableName: scan.table_name || 'Unknown',
          scanType: scan.scan_type || 'Unknown',
          filters: scan.filters || [],
          filterExpression: scan.table_function_filter || extractFilterExpression(leftData.plan, scan.table_name),
          timestamp: scan.timestamp || '',
          metrics: {
            rowsScanned: scan.rows_scanned || 0,
            duration: scan.duration_ms || 0
          }
        });
      });
    }

    // Only process right data if we're showing target-only or split view
    if ((parentViewMode === 'target-only' || parentViewMode === 'split') && rightData?.dataScans) {
      rightData.dataScans.forEach(scan => {
        result.push({
          profileId: 'Target',
          tableName: scan.table_name || 'Unknown',
          scanType: scan.scan_type || 'Unknown',
          filters: scan.filters || [],
          filterExpression: scan.table_function_filter || extractFilterExpression(rightData.plan, scan.table_name),
          timestamp: scan.timestamp || '',
          metrics: {
            rowsScanned: scan.rows_scanned || 0,
            duration: scan.duration_ms || 0
          }
        });
      });
    }

    return result;
  }, [leftData, rightData, parentViewMode]);

  // Get unique scan types
  const scanTypes = React.useMemo(() => {
    const types = new Set<string>();
    scans.forEach(scan => {
      types.add(scan.scanType);
    });
    return Array.from(types).sort();
  }, [scans]);

  // Extract unique filter patterns from TableFunction expressions
  const filterPatterns = React.useMemo(() => {
    const patterns = new Set<string>();
    
    scans.forEach(scan => {
      if (scan.filterExpression) {
        const filterParts = scan.filterExpression.split(',').map(part => part.trim());
        filterParts.forEach(part => {
          // Extract patterns like "Filter on `instance_uuid`" or "Filter on `cluster_member_id`"
          const match = part.match(/Filter on `([^`]+)`/);
          if (match) {
            patterns.add(match[1]); // Add the field name (e.g., "instance_uuid")
          }
        });
      }
    });
    
    return Array.from(patterns).sort();
  }, [scans]);

  // Filter by rows scanned
  const meetsRowsScannedCriteria = (scan: DataScan): boolean => {
    switch (rowsScannedFilter) {
      case 'low':
        return scan.metrics.rowsScanned <= 100;
      case 'medium':
        return scan.metrics.rowsScanned > 100 && scan.metrics.rowsScanned <= 1000;
      case 'high':
        return scan.metrics.rowsScanned > 1000;
      default:
        return true; // 'any' or invalid value
    }
  };

  // Filter by filter pattern
  const meetsFilterPatternCriteria = (scan: DataScan): boolean => {
    if (!selectedFilterPattern) return true;
    if (!scan.filterExpression) return false;
    
    // Check if the selected pattern is in the filter expression
    return scan.filterExpression.includes(`Filter on \`${selectedFilterPattern}\``);
  };

  // Filter scans based on all criteria
  const filteredScans = React.useMemo(() => {
    return scans.filter(scan => 
      scan.tableName.toLowerCase().includes(searchTerm.toLowerCase()) &&
      (selectedScanTypes.length === 0 || selectedScanTypes.includes(scan.scanType)) &&
      meetsRowsScannedCriteria(scan) &&
      meetsFilterPatternCriteria(scan)
    );
  }, [scans, selectedScanTypes, searchTerm, rowsScannedFilter, selectedFilterPattern]);

  // Group scans by table name
  const scansByTable = React.useMemo(() => {
    const grouped = new Map<string, DataScan[]>();
    
    filteredScans.forEach(scan => {
      if (!grouped.has(scan.tableName)) {
        grouped.set(scan.tableName, []);
      }
      grouped.get(scan.tableName)?.push(scan);
    });
    
    return grouped;
  }, [filteredScans]);

  // Helper function to check if a scan has differences compared to others
  const hasDifferences = (scan: DataScan, allScans: DataScan[]): boolean => {
    return allScans.some(otherScan => 
      otherScan.profileId !== scan.profileId && (
        otherScan.scanType !== scan.scanType ||
        otherScan.filters.join(',') !== scan.filters.join(',') ||
        Math.abs(otherScan.metrics.rowsScanned - scan.metrics.rowsScanned) > 0 ||
        otherScan.filterExpression !== scan.filterExpression
      )
    );
  };

  const renderAllScansView = () => (
    <div className="overflow-x-auto text-base">
      <table className="min-w-full border-collapse border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-2 border">Profile</th>
            <th className="p-2 border">Table Name</th>
            <th className="p-2 border">Scan Type</th>
            <th className="p-2 border">Filters</th>
            <th className="p-2 border">Filter Expression</th>
            <th className="p-2 border">Metrics</th>
          </tr>
        </thead>
        <tbody>
          {filteredScans.map((scan, idx) => (
            <tr key={`${scan.profileId}-${scan.tableName}-${idx}`} className="hover:bg-gray-50">
              <td className="p-2 border">{scan.profileId}</td>
              <td className="p-2 border">{scan.tableName}</td>
              <td className="p-2 border">{scan.scanType}</td>
              <td className="p-2 border">{scan.filters.join(', ')}</td>
              <td className="p-2 border whitespace-pre-wrap">{/* removed text-xs */}
                {scan.filterExpression || ''}
              </td>
              <td className="p-2 border">
                <div>Rows: {scan.metrics.rowsScanned}</div>
                <div>Duration: {scan.metrics.duration}ms</div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTableComparisonView = () => (
    <div className="space-y-8 text-base">
      {Array.from(scansByTable.entries()).map(([tableName, scans]) => (
        <div key={tableName} className="border rounded-lg p-4 bg-white">
          <h3 className="text-lg font-medium mb-3 text-blue-800">{tableName}</h3>
          <table className="min-w-full border-collapse border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">Profile</th>
                <th className="p-2 border">Scan Type</th>
                <th className="p-2 border">Filters</th>
                <th className="p-2 border">Filter Expression</th>
                <th className="p-2 border">Metrics</th>
              </tr>
            </thead>
            <tbody>
              {scans.map((scan, idx) => (
                <tr 
                  key={`${scan.profileId}-${idx}`}
                  className={hasDifferences(scan, scans) ? "bg-yellow-50" : ""}
                >
                  <td className="p-2 border">{scan.profileId}</td>
                  <td className="p-2 border">{scan.scanType}</td>
                  <td className="p-2 border">{scan.filters.join(', ')}</td>
                  <td className="p-2 border whitespace-pre-wrap">{/* removed text-xs */}
                    {scan.filterExpression || ''}
                  </td>
                  <td className="p-2 border">
                    <div>Rows: {scan.metrics.rowsScanned}</div>
                    <div>Duration: {scan.metrics.duration}ms</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  );

  const handleScanTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedOptions = Array.from(e.target.selectedOptions, option => option.value);
    setSelectedScanTypes(selectedOptions);
  };

  if (!leftData || !rightData) {
    return (
      <div className="p-4 text-center text-gray-500">
        Please upload files on both sides to view data scans
      </div>
    );
  }

  if (scans.length === 0) {
    return (
      <div className="p-4 text-center text-gray-500">
        No data scans found in the profile data
      </div>
    );
  }

  return (
    <div className="space-y-4 text-base">
      {/* Show title for single column views */}
      {parentViewMode !== 'split' && (
        <div className="bg-blue-100 p-3 rounded-lg">
          <h2 className="text-lg font-medium text-blue-800">
            {parentViewMode === 'source-only' ? 'Source Data Scans' : 'Target Data Scans'}
          </h2>
        </div>
      )}
      
      <div className="bg-white p-4 rounded-lg shadow-sm">
        <div className="flex flex-wrap gap-4 mb-4">
          <div>
            <label htmlFor="viewMode" className="block text-sm font-medium text-gray-700 mb-1">
              View Mode:
            </label>
            <select
              id="viewMode"
              className="p-2 border border-gray-300 rounded-md"
              value={internalViewMode}
              onChange={(e) => setInternalViewMode(e.target.value as 'all' | 'byTable')}
            >
              <option value="all">All Scans</option>
              <option value="byTable">Compare by Table</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="scanType" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Scan Type:
            </label>
            <select
              id="scanType"
              className="p-2 border border-gray-300 rounded-md"
              multiple
              size={Math.min(4, scanTypes.length)}
              value={selectedScanTypes}
              onChange={handleScanTypeChange}
            >
              {scanTypes.map(type => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="rowsScanned" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Rows Scanned:
            </label>
            <select
              id="rowsScanned"
              className="p-2 border border-gray-300 rounded-md"
              value={rowsScannedFilter}
              onChange={(e) => setRowsScannedFilter(e.target.value)}
            >
              <option value="any">Any row count</option>
              <option value="low">Low (≤ 100 rows)</option>
              <option value="medium">Medium (101-1000 rows)</option>
              <option value="high">High (&gt; 1000 rows)</option>
            </select>
          </div>
          
          <div>
            <label htmlFor="filterPattern" className="block text-sm font-medium text-gray-700 mb-1">
              Filter by Table Function Pattern:
            </label>
            <select
              id="filterPattern"
              className="p-2 border border-gray-300 rounded-md"
              value={selectedFilterPattern}
              onChange={(e) => setSelectedFilterPattern(e.target.value)}
            >
              <option value="">Any Filter Pattern</option>
              {filterPatterns.map(pattern => (
                <option key={pattern} value={pattern}>
                  Filter on {pattern}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label htmlFor="tableSearch" className="block text-sm font-medium text-gray-700 mb-1">
              Search by Table Name:
            </label>
            <input
              id="tableSearch"
              type="text"
              className="p-2 border border-gray-300 rounded-md"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Enter table name..."
            />
          </div>
        </div>
        
        <div className="mb-2 text-sm text-gray-600">
          {filteredScans.length} scans found ({scansByTable.size} unique tables)
          {selectedFilterPattern && ` matching filter pattern: ${selectedFilterPattern}`}
        </div>
      </div>

      {internalViewMode === 'all' ? renderAllScansView() : renderTableComparisonView()}
    </div>
  );
};

export default DataScanComparison; 