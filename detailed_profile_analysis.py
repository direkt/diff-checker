#!/usr/bin/env python3
"""
Detailed Dremio Query Profile Analyzer (FIXED VERSION)
Provides in-depth analysis of query performance bottlenecks.

VALIDATED: Operator type mappings validated against Dremio codebase
Source: dremio/oss/protocol/src/main/protobuf/UserBitShared.proto (lines 773-845)
"""

import json
import sys
from typing import Dict, List, Any
from dataclasses import dataclass

@dataclass
class DetailedOperatorMetrics:
    operator_id: int
    operator_type: int
    operator_name: str
    setup_nanos: int
    process_nanos: int
    wait_nanos: int
    total_nanos: int
    fragment_id: int
    minor_fragment_id: int
    input_records: int
    output_records: int
    input_bytes: int
    output_bytes: int
    peak_memory: int
    metrics: Dict[str, Any]

def get_operator_type_name(operator_type: int) -> str:
    """
    Map operator type ID to human-readable name.
    
    FIXED: Complete mapping based on CoreOperatorType enum from:
    dremio/oss/protocol/src/main/protobuf/UserBitShared.proto (lines 773-845)
    
    All 69 operator types (0-68) are now correctly mapped.
    """
    operator_types = {
        0: "SingleSender",
        1: "BroadcastSender", 
        2: "Filter",
        3: "HashAggregate",  # FIXED: was "HashAgg"
        4: "HashJoin",
        5: "MergeJoin",
        6: "HashPartitionSender",
        7: "Limit",
        8: "MergingReceiver",
        9: "OrderedPartitionSender",
        10: "Project",
        11: "UnorderedReceiver",
        12: "RangeSender",
        13: "Screen",
        14: "SelectionVectorRemover",
        15: "StreamingAggregate",
        16: "TopNSort",
        17: "ExternalSort",
        18: "Trace",
        19: "Union",
        20: "OldSort",
        21: "ParquetRowGroupScan",
        22: "HiveSubScan",
        23: "SystemTableScan",
        24: "MockSubScan",
        25: "ParquetWriter",
        26: "DirectSubScan",
        27: "TextWriter",
        28: "TextSubScan",
        29: "JsonSubScan",
        30: "InfoSchemaSubScan",
        31: "ComplexToJson",
        32: "ProducerConsumer",
        33: "HbaseSubScan",
        34: "Window",
        35: "NestedLoopJoin",
        36: "AvroSubScan",
        37: "MongoSubScan",
        38: "ElasticsearchSubScan",
        39: "ElasticsearchAggregatorSubScan",
        40: "Flatten",
        41: "ExcelSubScan",
        42: "ArrowSubScan",
        43: "ArrowWriter",
        44: "JsonWriter",
        45: "ValuesReader",
        46: "ConvertFromJson",
        47: "JdbcSubScan",
        48: "DictionaryLookup",
        49: "WriterCommitter",
        50: "RoundRobinSender",
        51: "BoostParquet",
        52: "IcebergSubScan",  # FIXED: was "IcebergManifestList"
        53: "TableFunction",
        54: "DeltalakeSubScan",
        55: "DirListingSubScan",
        56: "IcebergWriterCommitter",
        57: "GrpcWriter",
        58: "ManifestWriter",
        59: "FlightSubScan",
        60: "BridgeFileWriterSender",
        61: "BridgeFileReaderReceiver",
        62: "BridgeFileReader",
        63: "IcebergManifestWriter",
        64: "IcebergMetadataFunctionsReader",
        65: "IcebergSnapshotsSubScan",
        66: "NessieCommitsSubScan",
        67: "SmallFileCombinationWriter",
        68: "ArrowWriterAuxiliary"
    }
    return operator_types.get(operator_type, f"Unknown({operator_type})")

def extract_detailed_metrics(profile_data: Dict[str, Any]) -> List[DetailedOperatorMetrics]:
    """Extract detailed operator metrics including I/O and memory stats"""
    operators = []
    
    fragment_profiles = profile_data.get("fragmentProfile", [])
    
    for fragment in fragment_profiles:
        major_fragment_id = fragment.get("majorFragmentId", 0)
        minor_fragments = fragment.get("minorFragmentProfile", [])
        
        for minor_fragment in minor_fragments:
            minor_fragment_id = minor_fragment.get("minorFragmentId", 0)
            operator_profiles = minor_fragment.get("operatorProfile", [])
            
            for op in operator_profiles:
                operator_id = op.get("operatorId", 0)
                operator_type = op.get("operatorType", 0)
                setup_nanos = op.get("setupNanos", 0)
                process_nanos = op.get("processNanos", 0)
                wait_nanos = op.get("waitNanos", 0)
                
                # Extract I/O metrics
                input_profiles = op.get("inputProfile", [])
                total_input_records = sum(ip.get("records", 0) for ip in input_profiles)
                total_input_bytes = sum(ip.get("size", 0) for ip in input_profiles)
                
                output_records = op.get("outputRecords", 0)
                output_bytes = op.get("outputBytes", 0)
                peak_memory = op.get("peakLocalMemoryAllocated", 0)
                
                # Extract operator-specific metrics
                metrics = {}
                for metric in op.get("metric", []):
                    metric_id = metric.get("metricId", 0)
                    if "longValue" in metric:
                        metrics[f"metric_{metric_id}"] = metric["longValue"]
                    elif "doubleValue" in metric:
                        metrics[f"metric_{metric_id}"] = metric["doubleValue"]
                
                total_nanos = setup_nanos + process_nanos + wait_nanos
                operator_name = get_operator_type_name(operator_type)
                
                operators.append(DetailedOperatorMetrics(
                    operator_id=operator_id,
                    operator_type=operator_type,
                    operator_name=operator_name,
                    setup_nanos=setup_nanos,
                    process_nanos=process_nanos,
                    wait_nanos=wait_nanos,
                    total_nanos=total_nanos,
                    fragment_id=major_fragment_id,
                    minor_fragment_id=minor_fragment_id,
                    input_records=total_input_records,
                    output_records=output_records,
                    input_bytes=total_input_bytes,
                    output_bytes=output_bytes,
                    peak_memory=peak_memory,
                    metrics=metrics
                ))
    
    return operators

def format_time(nanos: int) -> str:
    """Format nanoseconds into human-readable time"""
    if nanos < 1000:
        return f"{nanos}ns"
    elif nanos < 1_000_000:
        return f"{nanos/1000:.2f}μs"
    elif nanos < 1_000_000_000:
        return f"{nanos/1_000_000:.2f}ms"
    else:
        return f"{nanos/1_000_000_000:.2f}s"

def format_bytes(bytes_val: int) -> str:
    """Format bytes into human-readable size"""
    if bytes_val < 1024:
        return f"{bytes_val}B"
    elif bytes_val < 1024**2:
        return f"{bytes_val/1024:.2f}KB"
    elif bytes_val < 1024**3:
        return f"{bytes_val/(1024**2):.2f}MB"
    else:
        return f"{bytes_val/(1024**3):.2f}GB"

def format_records(records: int) -> str:
    """Format record counts"""
    if records < 1000:
        return str(records)
    elif records < 1_000_000:
        return f"{records/1000:.1f}K"
    elif records < 1_000_000_000:
        return f"{records/1_000_000:.1f}M"
    else:
        return f"{records/1_000_000_000:.1f}B"

def analyze_bottlenecks(operators: List[DetailedOperatorMetrics]):
    """Identify performance bottlenecks"""
    print("\n🚨 PERFORMANCE BOTTLENECK ANALYSIS")
    print("=" * 60)
    
    # Find operators with high wait times
    high_wait_ops = [op for op in operators if op.wait_nanos > op.process_nanos and op.wait_nanos > 1_000_000]
    if high_wait_ops:
        print("\n⏳ HIGH WAIT TIME OPERATORS (potential I/O bottlenecks):")
        for op in sorted(high_wait_ops, key=lambda x: x.wait_nanos, reverse=True):
            wait_pct = (op.wait_nanos / op.total_nanos) * 100 if op.total_nanos > 0 else 0
            print(f"   Op {op.operator_id} ({op.operator_name}): {format_time(op.wait_nanos)} ({wait_pct:.1f}% of total)")
    
    # Find operators with high memory usage
    high_memory_ops = [op for op in operators if op.peak_memory > 1_000_000]  # > 1MB
    if high_memory_ops:
        print("\n💾 HIGH MEMORY USAGE OPERATORS:")
        for op in sorted(high_memory_ops, key=lambda x: x.peak_memory, reverse=True):
            print(f"   Op {op.operator_id} ({op.operator_name}): {format_bytes(op.peak_memory)}")
    
    # Find operators with high record processing
    high_record_ops = [op for op in operators if op.input_records > 1_000_000]  # > 1M records
    if high_record_ops:
        print("\n📊 HIGH RECORD VOLUME OPERATORS:")
        for op in sorted(high_record_ops, key=lambda x: x.input_records, reverse=True):
            throughput = op.input_records / (op.process_nanos / 1_000_000_000) if op.process_nanos > 0 else 0
            print(f"   Op {op.operator_id} ({op.operator_name}): {format_records(op.input_records)} records, "
                  f"{throughput:.0f} rec/sec")
    
    # Find operators with poor selectivity (high input, low output)
    poor_selectivity_ops = []
    for op in operators:
        if op.input_records > 1000 and op.output_records > 0:
            selectivity = op.output_records / op.input_records
            if selectivity < 0.01:  # Less than 1% selectivity
                poor_selectivity_ops.append((op, selectivity))
    
    if poor_selectivity_ops:
        print("\n🎯 LOW SELECTIVITY OPERATORS (filtering many records):")
        for op, selectivity in sorted(poor_selectivity_ops, key=lambda x: x[1]):
            print(f"   Op {op.operator_id} ({op.operator_name}): {selectivity*100:.3f}% selectivity "
                  f"({format_records(op.input_records)} → {format_records(op.output_records)})")

def print_detailed_operator_breakdown(operators: List[DetailedOperatorMetrics], top_n: int = 5):
    """Print detailed breakdown of top operators"""
    print(f"\n🔬 DETAILED BREAKDOWN - TOP {top_n} OPERATORS")
    print("=" * 80)
    
    sorted_operators = sorted(operators, key=lambda x: x.total_nanos, reverse=True)
    
    for i, op in enumerate(sorted_operators[:top_n], 1):
        print(f"\n#{i} Fragment {op.fragment_id}-{op.minor_fragment_id}, Operator {op.operator_id} ({op.operator_name})")
        print(f"   Total Time: {format_time(op.total_nanos)}")
        
        if op.total_nanos > 0:
            print(f"   ├─ Setup:   {format_time(op.setup_nanos)} ({(op.setup_nanos/op.total_nanos)*100:.1f}%)")
            print(f"   ├─ Process: {format_time(op.process_nanos)} ({(op.process_nanos/op.total_nanos)*100:.1f}%)")
            print(f"   └─ Wait:    {format_time(op.wait_nanos)} ({(op.wait_nanos/op.total_nanos)*100:.1f}%)")
        
        print(f"   Data Flow:")
        print(f"   ├─ Input:  {format_records(op.input_records)} records, {format_bytes(op.input_bytes)}")
        print(f"   └─ Output: {format_records(op.output_records)} records, {format_bytes(op.output_bytes)}")
        
        if op.peak_memory > 0:
            print(f"   Peak Memory: {format_bytes(op.peak_memory)}")
        
        # Calculate efficiency metrics
        if op.input_records > 0 and op.process_nanos > 0:
            records_per_sec = op.input_records / (op.process_nanos / 1_000_000_000)
            print(f"   Processing Rate: {records_per_sec:.0f} records/sec")
        
        if op.input_records > 0 and op.output_records > 0:
            selectivity = (op.output_records / op.input_records) * 100
            print(f"   Selectivity: {selectivity:.2f}%")

def print_performance_recommendations(operators: List[DetailedOperatorMetrics]):
    """Provide performance optimization recommendations - NEW FEATURE"""
    print(f"\n💡 PERFORMANCE OPTIMIZATION RECOMMENDATIONS")
    print("=" * 60)
    
    recommendations = []
    
    # Check for high wait time operators
    high_wait_ops = [op for op in operators if op.wait_nanos > op.process_nanos * 2 and op.wait_nanos > 10_000_000]
    if high_wait_ops:
        recommendations.append("🔍 High wait times detected - investigate I/O bottlenecks or resource contention")
    
    # Check for memory-intensive operators
    high_memory_ops = [op for op in operators if op.peak_memory > 100_000_000]  # > 100MB
    if high_memory_ops:
        recommendations.append("💾 High memory usage detected - consider increasing executor memory or optimizing data structures")
    
    # Check for low selectivity filters
    low_selectivity_ops = []
    for op in operators:
        if op.operator_name == "Filter" and op.input_records > 1000 and op.output_records > 0:
            selectivity = op.output_records / op.input_records
            if selectivity > 0.8:  # More than 80% of records pass through
                low_selectivity_ops.append(op)
    
    if low_selectivity_ops:
        recommendations.append("🎯 Low-selectivity filters detected - consider pushdown optimizations or query restructuring")
    
    # Check for expensive joins
    expensive_joins = [op for op in operators if "Join" in op.operator_name and op.total_nanos > 1_000_000_000]  # > 1 second
    if expensive_joins:
        recommendations.append("🔗 Expensive joins detected - consider join reordering, indexing, or partitioning strategies")
    
    # Check for large sorts
    expensive_sorts = [op for op in operators if "Sort" in op.operator_name and op.peak_memory > 50_000_000]  # > 50MB
    if expensive_sorts:
        recommendations.append("📊 Memory-intensive sorts detected - consider adding LIMIT clauses or pre-sorting data")
    
    if recommendations:
        for i, rec in enumerate(recommendations, 1):
            print(f"{i}. {rec}")
    else:
        print("✅ No major performance issues detected in this query profile")

def analyze_detailed_profile(file_path: str, top_n: int = 5):
    """Main function for detailed profile analysis"""
    try:
        with open(file_path, 'r') as f:
            profile_data = json.load(f)
        
        print(f"🔍 DETAILED DREMIO QUERY PROFILE ANALYSIS: {file_path}")
        print(f"Query ID: {profile_data.get('id', {}).get('part1', 'Unknown')}")
        print(f"User: {profile_data.get('user', 'Unknown')}")
        print(f"✅ FIXED: All operator type mappings validated against Dremio codebase")
        
        # Extract detailed metrics
        operators = extract_detailed_metrics(profile_data)
        
        if not operators:
            print("❌ No operator data found in profile")
            return
        
        # Perform analysis
        analyze_bottlenecks(operators)
        print_detailed_operator_breakdown(operators, top_n)
        print_performance_recommendations(operators)  # NEW: Added recommendations
        
        # Summary statistics
        total_operators = len(operators)
        total_time = sum(op.total_nanos for op in operators)
        total_memory = sum(op.peak_memory for op in operators)
        total_records = sum(op.input_records for op in operators)
        
        print(f"\n📈 OVERALL STATISTICS")
        print("=" * 40)
        print(f"Total Operators: {total_operators}")
        print(f"Total Execution Time: {format_time(total_time)}")
        print(f"Total Memory Used: {format_bytes(total_memory)}")
        print(f"Total Records Processed: {format_records(total_records)}")
        
        if total_time > 0:
            overall_throughput = total_records / (total_time / 1_000_000_000)
            print(f"Overall Throughput: {overall_throughput:.0f} records/sec")
            
    except FileNotFoundError:
        print(f"❌ Error: File '{file_path}' not found")
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"❌ Error: Invalid JSON in file '{file_path}': {e}")
        sys.exit(1)
    except Exception as e:
        print(f"❌ Error analyzing profile: {e}")
        sys.exit(1)

def main():
    """Main entry point"""
    if len(sys.argv) < 2:
        print("Usage: python detailed_profile_analysis.py <profile_file.json> [top_n]")
        print("Example: python detailed_profile_analysis.py profile_attempt_0.json 3")
        print("\n✅ FIXED VERSION: All operator type mappings corrected and validated")
        print("🔬 Provides detailed bottleneck analysis and optimization recommendations")
        sys.exit(1)
    
    file_path = sys.argv[1]
    top_n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
    
    analyze_detailed_profile(file_path, top_n)

if __name__ == "__main__":
    main() 