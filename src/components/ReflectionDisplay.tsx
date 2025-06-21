import React from 'react';
import { ProfileData } from '@/utils/jqUtils';

interface ReflectionDisplayProps {
  leftData: ProfileData;
  rightData: ProfileData;
}

const ReflectionDisplay: React.FC<ReflectionDisplayProps> = ({ leftData, rightData }) => {
  return (
    <div className="grid grid-cols-2 gap-8 mt-8">
      <div className="space-y-6">
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="font-medium text-blue-800 mb-3">Source Chosen Reflections</h3>
          {leftData.reflections?.chosen?.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2">
              {leftData.reflections.chosen.map((reflection, index) => (
                <li key={index} className="text-gray-700">{reflection}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No chosen reflections</p>
          )}
          {leftData.reflections?.chosen?.some(r => r.includes('accelerationDetails') || r.includes('Default Reflections')) && (
            <p className="text-xs text-blue-600 mt-3">Note: These reflections were extracted from encoded acceleration details</p>
          )}
        </div>
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="font-medium text-blue-800 mb-3">Source Considered Reflections</h3>
          {leftData.reflections?.considered?.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2">
              {leftData.reflections.considered.map((reflection, index) => (
                <li key={index} className="text-gray-700">{reflection}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No considered reflections</p>
          )}
          {leftData.reflections?.considered?.some(r => r.includes('Raw Reflection') || r.includes('Error:')) && (
            <p className="text-xs text-blue-600 mt-3">Note: These reflections were extracted from encoded acceleration details</p>
          )}
        </div>
      </div>
      <div className="space-y-6">
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="font-medium text-blue-800 mb-3">Target Chosen Reflections</h3>
          {rightData.reflections?.chosen?.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2">
              {rightData.reflections.chosen.map((reflection, index) => (
                <li key={index} className="text-gray-700">{reflection}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No chosen reflections</p>
          )}
          {rightData.reflections?.chosen?.some(r => r.includes('accelerationDetails') || r.includes('Default Reflections')) && (
            <p className="text-xs text-blue-600 mt-3">Note: These reflections were extracted from encoded acceleration details</p>
          )}
        </div>
        <div className="border rounded-lg p-4 bg-white shadow-sm">
          <h3 className="font-medium text-blue-800 mb-3">Target Considered Reflections</h3>
          {rightData.reflections?.considered?.length > 0 ? (
            <ul className="list-disc pl-5 space-y-2">
              {rightData.reflections.considered.map((reflection, index) => (
                <li key={index} className="text-gray-700">{reflection}</li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-500 italic">No considered reflections</p>
          )}
          {rightData.reflections?.considered?.some(r => r.includes('Raw Reflection') || r.includes('Error:')) && (
            <p className="text-xs text-blue-600 mt-3">Note: These reflections were extracted from encoded acceleration details</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReflectionDisplay;