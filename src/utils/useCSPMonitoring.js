/**
 * CSP Monitoring Hook for React
 * 
 * Usage in any component:
 * 
 *   import { useCSPMonitoring } from '../utils/useCSPMonitoring';
 *   
 *   function MyComponent() {
 *     useCSPMonitoring({
 *       verbose: true,
 *       customHandler: (violation) => {
 *         // Handle violation
 *       }
 *     });
 *   }
 */

import { useEffect } from 'react';

/**
 * React Hook for CSP violation monitoring
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.verbose - Log violations to console
 * @param {Function} options.customHandler - Custom violation handler
 * @param {string} options.reportEndpoint - Endpoint to send reports to
 */
export function useCSPMonitoring(options = {}) {
  useEffect(() => {
    const {
      verbose = import.meta.env.DEV,
      customHandler = null,
      reportEndpoint = null
    } = options;

    const handleViolation = (event) => {
      const violation = {
        blockedURI: event.blockedURI || 'none',
        violatedDirective: event.violatedDirective || 'unknown',
        sourceFile: event.sourceFile || 'unknown',
        lineNumber: event.lineNumber || 0,
        columnNumber: event.columnNumber || 0,
        timestamp: new Date().toISOString()
      };

      if (verbose) {
        console.warn('🚨 CSP Violation:', violation);
      }

      if (customHandler) {
        customHandler(violation);
      }

      if (reportEndpoint) {
        navigator.sendBeacon(
          reportEndpoint,
          JSON.stringify(violation)
        );
      }
    };

    document.addEventListener('securitypolicyviolation', handleViolation);

    return () => {
      document.removeEventListener('securitypolicyviolation', handleViolation);
    };
  }, []);
}

export default useCSPMonitoring;
