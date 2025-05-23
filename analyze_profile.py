#!/usr/bin/env python3
"""
Dremio Query Profile Analyzer
Finds the longest running operators and phases from a query profile JSON file.
"""

import json
import sys
from typing import Dict, List, Tuple, Any
from dataclasses import dataclass
from pathlib import Path

@dataclass
class OperatorTiming:
    operator_id: int
    operator_type: int
    operator_name: str
    setup_nanos: int
    process_nanos: int
    wait_nanos: int
    total_nanos: int
    fragment_id: int
    minor_fragment_id: int

@dataclass
class PhaseTiming:
    phase_name: str
    duration_millis: int

def get_operator_type_name(operator_type: int) -> str:
    """Map operator type ID to human-readable name"""
    operator_types = {
        2: "Filter",
        3: "HashAgg", 
        10: "Project",
        13: "Screen",
        14: "SelectionVectorRemover",
        52: "IcebergManifestList",
        53: "TableFunction"
    }
    return operator_types.get(operator_type, f"Unknown({operator_type})")

def analyze_operators(profile_data: Dict[str, Any]) -> List[OperatorTiming]:
    """Extract and analyze operator timings from the profile"""
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
                
                total_nanos = setup_nanos + process_nanos + wait_nanos
                operator_name = get_operator_type_name(operator_type)
                
                operators.append(OperatorTiming(
                    operator_id=operator_id,
                    operator_type=operator_type,
                    operator_name=operator_name,
                    setup_nanos=setup_nanos,
                    process_nanos=process_nanos,
                    wait_nanos=wait_nanos,
                    total_nanos=total_nanos,
                    fragment_id=major_fragment_id,
                    minor_fragment_id=minor_fragment_id
                ))
    
    return operators

def analyze_phases(profile_data: Dict[str, Any]) -> List[PhaseTiming]:
    """Extract and analyze phase timings from the profile"""
    phases = []
    
    plan_phases = profile_data.get("planPhases", [])
    
    for phase in plan_phases:
        phase_name = phase.get("phaseName", "Unknown")
        duration_millis = phase.get("durationMillis", 0)
        
        phases.append(PhaseTiming(
            phase_name=phase_name,
            duration_millis=duration_millis
        ))
    
    return phases

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

def format_millis(millis: int) -> str:
    """Format milliseconds into human-readable time"""
    if millis < 1000:
        return f"{millis}ms"
    else:
        return f"{millis/1000:.2f}s"

def print_top_operators(operators: List[OperatorTiming], top_n: int = 10):
    """Print the top N longest running operators"""
    print(f"\n🔥 TOP {top_n} LONGEST RUNNING OPERATORS")
    print("=" * 80)
    
    # Sort by total time
    sorted_operators = sorted(operators, key=lambda x: x.total_nanos, reverse=True)
    
    print(f"{'Rank':<4} {'Fragment':<8} {'Op ID':<5} {'Type':<20} {'Setup':<12} {'Process':<12} {'Wait':<12} {'Total':<12}")
    print("-" * 80)
    
    for i, op in enumerate(sorted_operators[:top_n], 1):
        print(f"{i:<4} {op.fragment_id}-{op.minor_fragment_id:<6} {op.operator_id:<5} {op.operator_name:<20} "
              f"{format_time(op.setup_nanos):<12} {format_time(op.process_nanos):<12} "
              f"{format_time(op.wait_nanos):<12} {format_time(op.total_nanos):<12}")

def print_top_phases(phases: List[PhaseTiming], top_n: int = 10):
    """Print the top N longest running phases"""
    print(f"\n⏱️  TOP {top_n} LONGEST RUNNING PHASES")
    print("=" * 60)
    
    # Sort by duration
    sorted_phases = sorted(phases, key=lambda x: x.duration_millis, reverse=True)
    
    print(f"{'Rank':<4} {'Phase Name':<40} {'Duration':<12}")
    print("-" * 60)
    
    for i, phase in enumerate(sorted_phases[:top_n], 1):
        print(f"{i:<4} {phase.phase_name:<40} {format_millis(phase.duration_millis):<12}")

def print_summary_stats(profile_data: Dict[str, Any], operators: List[OperatorTiming], phases: List[PhaseTiming]):
    """Print overall summary statistics"""
    print("\n📊 QUERY EXECUTION SUMMARY")
    print("=" * 50)
    
    # Query timing
    start_time = profile_data.get("start", 0)
    end_time = profile_data.get("end", 0)
    total_query_time = end_time - start_time
    
    planning_start = profile_data.get("planningStart", 0)
    planning_end = profile_data.get("planningEnd", 0)
    planning_time = planning_end - planning_start
    
    print(f"Total Query Time: {format_millis(total_query_time)}")
    print(f"Planning Time: {format_millis(planning_time)}")
    
    # Operator stats
    if operators:
        total_operator_time = sum(op.total_nanos for op in operators)
        max_operator_time = max(op.total_nanos for op in operators)
        avg_operator_time = total_operator_time / len(operators)
        
        print(f"Total Operator Time: {format_time(total_operator_time)}")
        print(f"Max Operator Time: {format_time(max_operator_time)}")
        print(f"Avg Operator Time: {format_time(int(avg_operator_time))}")
        print(f"Number of Operators: {len(operators)}")
    
    # Phase stats
    if phases:
        total_phase_time = sum(phase.duration_millis for phase in phases)
        max_phase_time = max(phase.duration_millis for phase in phases)
        
        print(f"Total Phase Time: {format_millis(total_phase_time)}")
        print(f"Max Phase Time: {format_millis(max_phase_time)}")
        print(f"Number of Phases: {len(phases)}")

def analyze_profile_file(file_path: str, top_n: int = 10):
    """Main function to analyze a profile file"""
    try:
        with open(file_path, 'r') as f:
            profile_data = json.load(f)
        
        print(f"🔍 ANALYZING QUERY PROFILE: {file_path}")
        print(f"Query ID: {profile_data.get('id', {}).get('part1', 'Unknown')}")
        print(f"User: {profile_data.get('user', 'Unknown')}")
        
        # Analyze operators and phases
        operators = analyze_operators(profile_data)
        phases = analyze_phases(profile_data)
        
        # Print results
        print_summary_stats(profile_data, operators, phases)
        print_top_operators(operators, top_n)
        print_top_phases(phases, top_n)
        
        # Find the single longest running item
        if operators:
            longest_operator = max(operators, key=lambda x: x.total_nanos)
            print(f"\n🏆 LONGEST RUNNING OPERATOR:")
            print(f"   Fragment {longest_operator.fragment_id}-{longest_operator.minor_fragment_id}, "
                  f"Operator {longest_operator.operator_id} ({longest_operator.operator_name}): "
                  f"{format_time(longest_operator.total_nanos)}")
        
        if phases:
            longest_phase = max(phases, key=lambda x: x.duration_millis)
            print(f"\n🏆 LONGEST RUNNING PHASE:")
            print(f"   {longest_phase.phase_name}: {format_millis(longest_phase.duration_millis)}")
            
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
        print("Usage: python analyze_profile.py <profile_file.json> [top_n]")
        print("Example: python analyze_profile.py profile_attempt_0.json 5")
        sys.exit(1)
    
    file_path = sys.argv[1]
    top_n = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    
    analyze_profile_file(file_path, top_n)

if __name__ == "__main__":
    main() 