// Quick test of attempt detection logic
import { parseAttemptInfo } from './src/utils/multipleAttemptsUtils.ts';

// Test with sample file names from the schemmaChangeDetectedError folder
const testFiles = [
  'log_attempt_0.json',
  'log_attempt_1.json', 
  'log_attempt_9.json',
  'profile_attempt_0.json',
  'profile_attempt_5.json',
  'header.json'
];

console.log('Testing parseAttemptInfo:');
testFiles.forEach(filename => {
  const result = parseAttemptInfo(filename);
  console.log(filename, '->', result);
}); 