/* NWIS WITSML 1.4.1.1 / 1.3.1.1 Parser & Normalization Engine
   Equinor Volve Field Standardized Parser
   Converts raw WITSML XML into canonical NWIS telemetry schema with provenance.
*/
(function(root) {
  'use strict';

  class WITSMLParser {
    constructor() {
      this.canonicalMap = {
        timestamp: ['TIME', 'DATETIME', 'DATE_TIME', 'DATE'],
        measuredDepth: ['DEPTH', 'DEPT', 'DMEA', 'BITDEP', 'HOLE_DEPTH_MD'],
        rop: ['ROP_AVG', 'ROP', 'ROPA', 'RATE_OF_PENETRATION', '1/2FT ROP M/H'],
        torque: ['TORQUE_AVG', 'TORQUE', 'TORQ', 'TORQA', 'AVERAGE_SURFACE_TORQUE', 'AVERAGE SURFACE TORQUE KN.M'],
        hookLoad: ['HKLD_AVG', 'HKLD', 'HKLA', 'TOTAL_HOOKLOAD', 'AVERAGE_HOOKLOAD', 'AVERAGE HOOKLOAD KKGF', 'TOTAL HOOKLOAD KKGF'],
        standpipePressure: ['PUMP', 'SPP', 'SPPA', 'STANDPIPE_PRESSURE', 'AVERAGE_STANDPIPE_PRESSURE', 'AVERAGE STANDPIPE PRESSURE KPA'],
        wob: ['WOB_AVG', 'WOB', 'WOBA', 'WEIGHT_ON_BIT', 'WEIGHT ON BIT KKGF'],
        rpm: ['SURF_RPM', 'RPM', 'RPMA', 'AVERAGE_ROTARY_SPEED', 'BIT_RPM_AVG', 'AVERAGE ROTARY SPEED RPM'],
        flowIn: ['FLOWIN', 'MFIA', 'MUD_FLOW_IN', 'FLOW_IN', 'MUD FLOW IN L/MIN'],
        flowOut: ['FLOWOUT', 'FLOWOUTPC', 'MFOA', 'MUD_FLOW_OUT', 'MUD FLOW OUT % %'],
        mudWeight: ['MWIN', 'MWOUT', 'MDIA', 'MUD_DENSITY_IN', 'MUD_DENSITY_OUT', 'MUD DENSITY IN G/CM3'],
        ecd: ['FRAC_EQMD', 'POR_EQMD', 'ECD', 'EQUIVALENT_CIRCULATING_DENSITY', 'EQUIVALENT CIRCULATING DENSITY G/CM3'],
        gas: ['TOTGAS', 'GAS', 'TOTAL_GAS', 'GAS %']
      };
    }

    parseXML(xmlString, options = {}) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(xmlString, 'text/xml');

      const parserError = doc.querySelector('parsererror');
      if (parserError) {
        throw new Error('XML parsing error: ' + parserError.textContent);
      }

      const logElem = doc.querySelector('log') || doc.documentElement;
      const wellName = logElem.querySelector('nameWell')?.textContent?.trim() || options.wellName || 'NO 15/9-F-12';
      const wellboreName = logElem.querySelector('nameWellbore')?.textContent?.trim() || options.wellboreName || '15/9-F-12 Main';
      const serviceCompany = logElem.querySelector('serviceCompany')?.textContent?.trim() || 'Equinor / Baker Hughes';
      const nullValue = logElem.querySelector('nullValue')?.textContent?.trim() || '-999.25';
      const indexType = logElem.querySelector('indexType')?.textContent?.trim() || 'date time';

      // Parse logCurveInfo
      const curves = {};
      const curveNodes = logElem.querySelectorAll('logCurveInfo');
      curveNodes.forEach(node => {
        const mnem = node.querySelector('mnemonic')?.textContent?.trim();
        const unit = node.querySelector('unit')?.textContent?.trim();
        const desc = node.querySelector('curveDescription')?.textContent?.trim();
        const type = node.querySelector('typeLogData')?.textContent?.trim();
        if (mnem) {
          curves[mnem] = { mnemonic: mnem, unit: unit || '', description: desc || '', type: type || 'double' };
        }
      });

      // Parse logData
      const logData = logElem.querySelector('logData');
      if (!logData) {
        return { wellName, wellboreName, serviceCompany, curves, records: [] };
      }

      const mnemListStr = logData.querySelector('mnemonicList')?.textContent?.trim();
      const unitListStr = logData.querySelector('unitList')?.textContent?.trim();

      const mnemonics = mnemListStr ? mnemListStr.split(',').map(s => s.trim()) : Object.keys(curves);
      const units = unitListStr ? unitListStr.split(',').map(s => s.trim()) : mnemonics.map(m => curves[m]?.unit || '');

      // Create index mapping for canonical properties
      const indexMap = {};
      const unitMap = {};
      for (const [canon, aliases] of Object.entries(this.canonicalMap)) {
        let foundIdx = -1;
        for (const alias of aliases) {
          const idx = mnemonics.findIndex(m => m.toUpperCase() === alias.toUpperCase());
          if (idx !== -1) {
            foundIdx = idx;
            break;
          }
        }
        indexMap[canon] = foundIdx;
        unitMap[canon] = foundIdx !== -1 ? units[foundIdx] : null;
      }

      // Parse data elements
      const records = [];
      const dataNodes = logData.querySelectorAll('data');

      dataNodes.forEach((node, rowIdx) => {
        const line = node.textContent?.trim();
        if (!line) return;
        const vals = line.split(',').map(v => v.trim());

        const record = {
          rawIndex: rowIdx,
          wellId: wellName.replace('NO ', '').trim(),
          wellbore: wellboreName
        };

        for (const [canon, idx] of Object.entries(indexMap)) {
          if (idx === -1 || idx >= vals.length) {
            record[canon] = null;
            continue;
          }

          const rawVal = vals[idx];
          if (rawVal === nullValue || rawVal === '' || rawVal === '-999.25' || rawVal === '-999') {
            record[canon] = null;
          } else if (canon === 'timestamp') {
            record[canon] = rawVal;
          } else {
            const num = parseFloat(rawVal);
            record[canon] = isNaN(num) ? rawVal : this.normalizeUnit(canon, num, unitMap[canon]);
          }
        }

        record.provenance = {
          sourceDataset: 'Equinor Volve Field Open Data',
          sourceWell: wellName,
          indexType,
          originalMnemonics: mnemonics
        };

        records.push(record);
      });

      return {
        wellName,
        wellboreName,
        serviceCompany,
        indexType,
        nullValue,
        curves,
        mnemonics,
        units,
        records
      };
    }

    normalizeUnit(canon, val, originalUnit) {
      if (val === null || val === undefined || isNaN(val)) return null;
      const u = (originalUnit || '').toLowerCase();

      switch (canon) {
        case 'standpipePressure':
          // Convert Pa to psi or kPa to psi
          if (u === 'pa') return Math.round(val * 0.000145038 * 10) / 10;
          if (u === 'kpa') return Math.round(val * 0.145038 * 10) / 10;
          if (u === 'bar') return Math.round(val * 14.5038 * 10) / 10;
          return Math.round(val * 10) / 10;

        case 'torque':
          // Convert N.m to kN.m
          if (u === 'n.m' || u === 'nm') return Math.round((val / 1000) * 100) / 100;
          return Math.round(val * 100) / 100;

        case 'hookLoad':
        case 'wob':
          // Convert N to klbs or kkgf to klbs
          if (u === 'n') return Math.round((val * 0.000224809) * 10) / 10;
          if (u === 'kkgf' || u === 't' || u === 'tonne') return Math.round((val * 2.20462) * 10) / 10;
          return Math.round(val * 10) / 10;

        case 'mudWeight':
        case 'ecd':
          // Convert kg/m3 to sg
          if (u === 'kg/m3' || val > 100) return Math.round((val / 1000) * 1000) / 1000;
          return Math.round(val * 1000) / 1000;

        case 'flowIn':
        case 'flowOut':
          // Convert m3/s to lpm
          if (u === 'm3/s') return Math.round(val * 60000);
          return Math.round(val);

        case 'rop':
          // Convert m/s to m/h
          if (u === 'm/s') return Math.round(val * 3600 * 100) / 100;
          return Math.round(val * 100) / 100;

        default:
          return val;
      }
    }
  }

  root.WITSMLParser = WITSMLParser;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = WITSMLParser;
  }
})(typeof window !== 'undefined' ? window : this);
