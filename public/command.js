/* NWIS Industrial Command Module — Auxiliary Utilities & Extension Hooks */
(function(root) {
  // Command module provides helper access if called externally
  if (typeof module !== 'undefined') {
    module.exports = { version: '2.0.0-industrial' };
  }
})(typeof window === 'undefined' ? globalThis : window);
