// // scheduling/DetectorScheduler.js
// const DetectorManager = require('../DetectorManager');
// const availableDetectors = require('../detectors');
// const CategoryFilter = require('../detector-filters/CategoryFilter');

// class DetectorScheduler {
//   constructor({ stitchedData, options = {} } = {}) {
//     this.stitchedData = stitchedData || {};
//     this.options = options;

//     this.detectorManager = new DetectorManager(options);
//     this.filter = new CategoryFilter();
//   }

//   // Run event-based detectors on incoming event or stitched entry
//   async runEventDetectors(entry, context = { mode: 'event' }) {
//     const eligibleDetectors = this.filter.filter(this.detectorManager.selectedDetectors, entry, context);
//     const findings = [];

//     for (const detector of eligibleDetectors) {
//       try {
//         const result = await detector.detect(entry);
//         if (Array.isArray(result) && result.length) findings.push(...result);
//       } catch (err) {
//         console.error('Detector error', detector.name, err?.message);
//       }
//     }
//     return findings;
//   }

//   // Run scheduled detectors (daily, time-based)
//   async runScheduledDetectors(context = { mode: 'daily' }) {
//     const now = new Date();
//     const eligibleDetectors = this.detectorManager.selectedDetectors.filter(d => {
//       // Only daily detectors
//       if (d.type !== 'daily') return false;
//       // Optionally add a schedule function per detector
//       if (d.schedule && typeof d.schedule === 'function') return d.schedule(now);
//       return true;
//     });

//     const findings = [];
//     for (const detector of eligibleDetectors) {
//       for (const stitchedEntry of Object.values(this.stitchedData)) {
//         try {
//           const result = await detector.detect(stitchedEntry);
//           if (Array.isArray(result) && result.length) findings.push(...result);
//         } catch (err) {
//           console.error('Scheduled detector error', detector.name, err?.message);
//         }
//       }
//     }
//     return findings;
//   }

//   // Start automatic scheduling loop
//   startDailyLoop(intervalMs = 60000) {
//     console.log('Starting daily scheduler loop...');
//     setInterval(async () => {
//       const now = new Date();
//       const hour = now.getHours();
//       const minute = now.getMinutes();

//       // Example: run at 4:00 PM daily
//       if (hour === 16 && minute === 0) {
//         console.log('Running daily detectors...');
//         await this.runScheduledDetectors();
//       }
//     }, intervalMs);
//   }
// }

// module.exports = DetectorScheduler;