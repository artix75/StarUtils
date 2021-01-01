/*
 *  StarUtils - A PixInsight Script that allow star fixing and easy mask creation
 *  Copyright (C) 2020  Giuseppe Fabio Nicotra <artix2 at gmail dot com>
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *   GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/

#include <pjsr/StarDetector.jsh>
#include <pjsr/PenCap.jsh>
#include <pjsr/PenStyle.jsh>
#include <pjsr/FileMode.jsh>
#include <pjsr/DataType.jsh>

#define STRING_PAD_LEFT  1
#define STRING_PAD_RIGHT 2

var MorphologicalTransformationMasks = {
   5: [
      0x00,0x01,0x01,0x01,0x00,
      0x01,0x01,0x01,0x01,0x01,
      0x01,0x01,0x01,0x01,0x01,
      0x01,0x01,0x01,0x01,0x01,
      0x00,0x01,0x01,0x01,0x00
   ],
   7: [
      0x00,0x00,0x01,0x01,0x01,0x00,0x00,
      0x00,0x01,0x01,0x01,0x01,0x01,0x00,
      0x01,0x01,0x01,0x01,0x01,0x01,0x01,
      0x01,0x01,0x01,0x01,0x01,0x01,0x01,
      0x01,0x01,0x01,0x01,0x01,0x01,0x01,
      0x00,0x01,0x01,0x01,0x01,0x01,0x00,
      0x00,0x00,0x01,0x01,0x01,0x00,0x00
   ],
   9: [
      0x00,0x00,0x01,0x01,0x01,0x01,0x01,0x00,0x00,
      0x00,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x00,
      0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,
      0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,
      0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,
      0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,
      0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,
      0x00,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x00,
      0x00,0x00,0x01,0x01,0x01,0x01,0x01,0x00,0x00
   ],
   /*13: [
      0x00,0x00,0x00,0x00,0x01,0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00,
      0x00,0x00,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x00,0x00,
      0x00,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x00,
      0x00,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x00,
      0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,
      0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,
      0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,
      0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,
      0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,
      0x00,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x00,
      0x00,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x00,
      0x00,0x00,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x01,0x00,0x00,
      0x00,0x00,0x00,0x00,0x01,0x01,0x01,0x01,0x01,0x00,0x00,0x00,0x00
   ]*/
};

var areaEnlargementFactor = {
   big: 2,
   average: 1.5
};

function randomID() {
   return Math.round(Math.random() * 100000);
}

function roundFloat(n, precision) {
   var f = Math.pow(10, precision);
   return Math.round(n * f) / f;
}

function rectToObj(r) {
   return {x: r.left, y: r.top, width: r.width, height: r.height};
}

function consoleFormattedString(string, style) {
   var color = style.color;
   if (color) {
      var r, g, b;
      if (color instanceof Array) {
         r = color[0];
         g = color[1];
         b = color[2];
      } else if (color instanceof Object) {
         r = color.red;
         g = color.green;
         b = color.blue;
      }
      r = r || 0; g = g || 0; b = b || 0;
      string = "\x1b[38;2;" + [r,g,b].join(';') + "m" + string + "\x1b[39m";
   }
   if (style.bold) string = '<b>' + string + '</b>';
   if (style.italic) string = '<i>' + string + '</i>';
   return string;
}

function capitalizedString(str, capitalize_words) {
   if (capitalize_words === true)
      return str.split(/\s+/).map(w => capitalizedString(w)).join(' ');
   return str.charAt(0).toUpperCase() + str.substr(1);
}

function padString(str, len, direction, character) {
   var curlen = str.length;
   len -= curlen;
   if (len <= 0) return str;
   character = character || ' ';
   var pad = character.repeat(len);
   direction = direction || STRING_PAD_RIGHT;
   if (direction === STRING_PAD_RIGHT) str = str + pad;
   else if (direction === STRING_PAD_LEFT) str = pad + str;
   return str;
}

function getTimeStamp(date, sep) {
   if (!sep && sep !== ' ') sep = '-';
   return format('%d%02d%02d%s%02d%02d%02d',
      date.getFullYear(),
      date.getMonth()+1,
      date.getDate(),
      sep,
      date.getHours(),
      date.getMinutes(),
      date.getSeconds()
   );
}

function FWHM(func, sigma, beta, varshape) {
   if (beta === undefined || beta === null) beta = 2;
   if (varshape === true)
      return 2 * sigma * Math.pow(beta*0.6931471805599453, 1/beta);
   switch (func) {
       case DynamicPSF.prototype.Function_Gaussian:
         return 2.3548200450309493 * sigma;
       case DynamicPSF.prototype.Function_Moffat:
         return 2 * sigma * Math.sqrt(Math.pow2(1/beta) - 1);
       case DynamicPSF.prototype.Function_Moffat10:
         return 0.5358113941912513 * sigma;
       case DynamicPSF.prototype.Function_Moffat8:
         return 0.6016900619596693 * sigma;
       case DynamicPSF.prototype.Function_Moffat6:
         return 0.6998915581984769 * sigma;
       case DynamicPSF.prototype.Function_Moffat4:
          return 0.8699588840921645 * sigma;
       case DynamicPSF.prototype.Function_Moffat25:
          return 1.1305006161394060 * sigma;
       case DynamicPSF.prototype.Function_Moffat15:
          return 1.5328418730817597 * sigma;
       case DynamicPSF.prototype.Function_Lorentzian:
          return 2 * sigma;
       default: return 0; // ?!
   }
}

function PSFFunctionName(func) {
   switch (func) {
       case DynamicPSF.prototype.Function_Gaussian:
         return "Gaussian";
       case DynamicPSF.prototype.Function_Moffat:
         return "Moffat";
       case DynamicPSF.prototype.Function_Moffat10:
         return "Moffat10";
       case DynamicPSF.prototype.Function_Moffat8:
         return "Moffat8";
       case DynamicPSF.prototype.Function_Moffat6:
         return "Moffat6";
       case DynamicPSF.prototype.Function_Moffat4:
          return "Moffat4";
       case DynamicPSF.prototype.Function_Moffat25:
          return "Moffat25";
       case DynamicPSF.prototype.Function_Moffat15:
          return "Moffat15";
       case DynamicPSF.prototype.Function_Lorentzian:
          return "Lorentzian";
       default: return "";
   }
}

function StarUtils(opts) {
   this.initialize(opts);
};

StarUtils.prototype = {
   /* Opts:
    *  - verbose: (true|false)
    *  - sensitivity: StarDetector sensitivity
    *  - peakResponse: StarDetector peakResponse
    *  - upperPeakLimit: StarDetector upperPeakLimit
    *  - maxDistortion: StarDetector maxDistortion
    *  - structureLayers : StarDetector structureLayers
    *  - xyStretch: xStarDetector yStretch
    *  - window: Image window to analyze/fix
    *  - sizeClassInterval: interval of size classes (default 10)
    *  - targetArea: Area of the image to be scanned, can be a Rect or a
    *                View (Preview)
    *  - detectPSFThreshold: used to determine which star should be used by
    *                        the PSF detector. It can be:
    *                         - An object whose properties specify the limits
    *                           ie: {width: '75%', flux: '50%'},
    *                         - A function having the star as its argument
    *                           returning true or false
    */
   initialize: function (opts) {
      this.opts = opts;
      this.verbose = opts.verbose = 1;
      opts.sizeClassInterval = opts.sizeClassInterval || 10;
      var sd = new StarDetector;
      this.sd = sd;
      if (opts.sensitivity) sd.sensitivity = opts.sensitivity;
      if (opts.peakResponse) sd.peakResponse = opts.peakResponse;
      if (opts.upperPeakLimit) sd.upperLimit = opts.upperPeakLimit;
      if (opts.maxDistortion) sd.maxDistortion = opts.maxDistortion;
      if (opts.structureLayers) sd.structureLayers = opts.structureLayers;
      if (opts.xyStretch) sd.xyStretch = opts.xyStretch;
      this.onStatusUpdate = opts.onStatusUpdate;
      this.onProgressUpdate = opts.onProgressUpdate;

      var win = this.win = opts.window || ImageWindow.activeWindow;
      var img = this.srcImage = win.mainView.image;
      this.log = {viewId: win.mainView.fullId,
         createdAt: (new Date().toString())};
      this.temporaryWindows = [];
      this.abortRequested = false;
      this.printHeader("StarUtils initialized");
      this.setStatus('Initialized');
   },
   analyzeStars: function () {
      var me = this;
      var verbose = this.opts.verbose;
      this.printHeader("Analyzing stars...");
      this.setStatus('Detecting stars');
      var intvl = this.opts.sizeClassInterval || 10;
      var lview = null;
      if (this.srcImage.isColor) {
         lview = this.createLuminanceImage(this.win.mainView);
         this.luminanceView = lview;
         lview.window.hide();
         this.temporaryWindows.push(lview.window);
      } else this.luminanceView = this.win.mainView;
      this.updateProgress(0,0);
      this.sd.progressCallback = function (count, tot) {
         processEvents();
         me.updateProgress(count, tot);
         if (me.abortRequested) return false;
         return true;
      }
      var stars = this.sd.stars(lview.image);
      var targetArea = this.opts.targetArea;
      if (targetArea) {
         if (targetArea instanceof View && targetArea.isPreview)
            targetArea = targetArea.window.previewRect(targetArea);
         log.targetArea = rectToObj(targetArea);
         stars = stars.filter(function (star) {
            return targetArea.includes(star.pos.x, star.pos.y);
         });
      }
      this.stars = stars;
      this.log.stars = stars;
      processEvents();
      if (me.abortRequested) return;
      console.show();
      console.writeln("Found " + stars.length + " star(s)");
      var i = 0;
      var previews = [];
      var sizes = [];
      var widths = [];
      var fluxes = [];
      var sizeClasses = this.sizeClasses = {};
      console.writeln("Processing stars...");
      processEvents();
      this.setStatus("Processing stars");
      this.updateProgress(0, stars.length);
      stars.forEach(function (star) {
         processEvents();
         if (me.abortRequested) return;
         if (verbose > 1) {
            console.writeln("STAR " + i);
            me.logStar(star);
         }
         sizes.push(star.size);
         fluxes.push(star.flux);
         var side = Math.sqrt(star.size);
         widths.push(side);
         if (verbose > 1) console.writeln(" - Square: " + side + 'x' + side);
         i++;
         star.width = side;
         var left = star.pos.x - (side / 2);
         var top = star.pos.y - (side / 2);
         var right = left + side;
         var bottom = top + side;
         var r = new Rect(left, top, right, bottom);
         star.rect = r;
         star.id = 's' + i;
         /* TODO: Obsolete with groupStars ? */
         var sizeClass = (parseInt(side / intvl) * intvl) + intvl;
         if (!sizeClasses[sizeClass]) sizeClasses[sizeClass] = [];
         sizeClasses[sizeClass].push(star);
         star.sizeClass = sizeClass;
         if (verbose > 1) {
            console.writeln(' - ID: ' + star.id);
            console.writeln('------------------');
         }
         me.updateProgress(i, stars.length);
      });
      processEvents();
      if (me.abortRequested) return;
      this.sizes = sizes;
      this.fluxes = fluxes;
      this.widths = widths;
      this.calculateStats();
      if (verbose > 1) this.printStats();
      this.setStatus('Done');
   },
   calculateStats: function () {
      this.printHeader("Calculating stats...");
      this.setStatus('Calculating stats');
      var stats = this.stats = {};
      var me = this;
      ['size', 'flux', 'width'].forEach(function (feat) {
         var pluralFeat = feat + (feat.match(/[s|x]$/) ? 'es' : 's');
         var capitalized = capitalizedString(feat);
         var values = me[pluralFeat];
         if (!values) return;
         if (!stats[feat]) stats[feat] = {};
         var featStats = stats[feat];
         featStats.min = me['min' + capitalized] = Math.minElem(values);
         featStats.max = me['max' + capitalized] = Math.maxElem(values);
         featStats.avg = me['avg' + capitalized] = Math.mean(values);
         featStats.median = me['median' + capitalized] = Math.median(values);
         featStats.stdDev = me[feat + 'StdDev'] = Math.stdDev(values);
         featStats.avgDev = me[feat + 'AvgDev'] = Math.avgDev(values);
         featStats.MAD = me[feat + 'MAD'] = Math.MAD(values);
         featStats.variance = me[feat + 'Var'] = Math.variance(values);
         featStats.meanToMaxRatio = featStats.avg / featStats.max;
      });
      var clsvalues = Object.keys(this.sizeClasses).map(function (cls) {
         return parseInt(cls);
      });
      this.classValues = clsvalues;
      this.maxClass = Math.maxElem(clsvalues) + this.opts.sizeClassInterval;
      this.log.stats = stats;
      this.log.stats.detectedStars = this.stars.length;
   },
   setLimits: function () {
      if (this.avgSize === undefined) this.calculateStats();
      this.minAllowedFlux = this.opts.minAllowedFlux || this.avgFlux;

      var highFactor = this.opts.highSizeLimit || 0.75;
      var lowFactor = this.opts.lowSizeLimit || 0.25;
      if (lowFactor > highFactor) lowFactor = highFactor;

      var high = (highFactor * (this.maxSize - this.minSize)) + this.minSize;
      var low = (lowFactor * (this.maxSize - this.minSize)) + this.minSize;
      this.sizeLimits = {high: high, low: low};

      highFactor = this.opts.highWidthLimit || 0.75;
      lowFactor = this.opts.lowWidthLimit || 0.25;
      if (lowFactor > highFactor) lowFactor = highFactor;

      var high = (highFactor * (this.maxWidth - this.minWidth)) + this.minWidth;
      var low = (lowFactor * (this.maxWidth - this.minWidth)) + this.minWidth;
      this.widthLimits = {high: high, low: low};

      highFactor = this.opts.highFluxLimit || 0.75;
      lowFactor = this.opts.lowFluxLimit || 0.25;
      if (lowFactor > highFactor) lowFactor = highFactor;

      high = (highFactor * (this.maxFlux - this.minFlux)) + this.minFlux;
      low = (lowFactor * (this.maxFlux - this.minFlux)) + this.minFlux;
      this.fluxLimits = {high: high, low: low};
   },
   sortStarsBy: function (feature) {
      if (!this.sortedStars) this.sortedStars = {};
      var sorted = this.sortedStars[feature];
      if (!sorted) {
         var objName = null, property = feature;
         if (feature.indexOf('.') > 0) {
            var components = feature.split('.');
            objName = components[0];
            property = components[1];
            sorted = this.stars.filter(star => {
               return star[objName] !== undefined;
            }).map(star => star);
         } else sorted = this.stars.map(star => star);
         sorted = sorted.sort((a, b) => {
            if (objName) {
               a = a[objName];
               b = b[objName];
            }
            return a[property] - b[property];
         });
         this.sortedStars[feature] = sorted;
      }
      return sorted;
   },
   groupStars: function (feature, opts) {
      if (!this.starGroups) this.starGroups = {};
      opts = opts || {};
      var interval = opts.interval || 2;
      var key = feature + ':' + interval;
      var grouped = this.starGroups[key];
      if (grouped) return grouped;
      var sorted = this.sortStarsBy(feature);
      grouped = {};
      if (sorted.length === 0) return grouped;
      var objName = null, property = feature;
      if (feature.indexOf('.') > 0) {
         var components = feature.split('.');
         objName = components[0];
         property = components[1];
      }
      sorted.forEach((star, i) => {
         var obj = (objName ? star[objName] : star);
         var val = obj[property];
         var grp = Math.round(val / interval) * interval;
         if (!grouped[grp]) grouped[grp] = [];
         grouped[grp].push(star);
      });
      this.starGroups[key] = grouped;
      return grouped;
   },
   computePSFThreshold: function (psfThreshold) {
      var me = this;
      var psfThresholdFunc = null;
      if (typeof(psfThreshold) === 'function') psfThresholdFunc = psfThreshold;
      else if (!psfThreshold) {
         psfThreshold = {
            flux: 'avg',
            width: '70%',
         };
      }
      if (psfThreshold && !psfThresholdFunc) {
         if (!isNaN(psfThreshold))
            psfThreshold = {width: psfThreshold, flux: psfThreshold};
         Object.keys(psfThreshold).forEach(function (k) {
            var val = psfThreshold[k];
            var is_percent = (typeof(val) === 'string' && val.indexOf('%') > 0);
            var values = null,
                valueProp = (k === 'flux' ? 'fluxes' : (k + 's')),
                stats = null;
            if (is_percent && (values = me[valueProp]))
               psfThreshold[k] = me.getValueByPercentage(val, values);
            else if ((stats = me.stats[k])) {
               val = stats[val];
               if (val) psfThreshold[k] = val;
            }
         });
      }
      return {
         psfThreshold: psfThreshold,
         psfThresholdFunc: psfThresholdFunc,
      };
   },
   shouldDetectPSF: function (star, threshold) {
      if (!threshold) return true;
      var psfThreshold = threshold.psfThreshold;
      var psfThresholdFunc = threshold.psfThresholdFunc;
      if (psfThresholdFunc) return psfThresholdFunc.call(me, star);
      else {
         var do_get_psf = false;
         var j;
         var thresholdKeys = Object.keys(psfThreshold);
         var keylen = thresholdKeys.length;
         for (j = 0; j < keylen; j++) {
            var key = thresholdKeys[j];
            var val = star[key];
            if (!isNaN(val)) {
               do_get_psf = (val > psfThreshold[key]);
               if (!do_get_psf) break;
            }
         }
         return do_get_psf;
      }
   },
   getStarPSFData: function (star) {
      var me = this;
      var lview = this.luminanceView;
      if (!lview) throw "Missing luminance view!";
      var psfrows = this.detectPSF(star, lview);
      var psfmsg = "PSF rows: " + psfrows.length;
      var psf = null;
      if (psfrows.length > 0) {
         psf = psfrows[0];
         var fwhm;
         if ((fwhm = psf.FWHMx)) {
            var xr = fwhm / star.width;
            if (xr >= 1.75) {
               console.warningln(
                  format("WARN (%s): abnormal FWHM to width ratio: %.2f!",
                     star.id, xr) +
                  " DynamicPSF probabily detected two stars, " +
                  "retrying with automatic aperture disabled..."
               );
               psf = null;
               psfrows = this.detectPSF(star, lview, {autoAperture: false});
               if (psfrows.length > 0) psf = psfrows[0];
            }
         }
      }
      if (psf) {
         star.psf = psf;
         var doLog = (me.opts.verbose > 1);
         if (doLog) {
            console.noteln(psfmsg);
            console.writeln("PSF center=" + star.psf.cx + ',' + star.psf.cy);
            console.writeln("Star center=" + star.pos.x + ',' + star.pos.y);
            console.writeln("PSF size=" + star.psf.sx + ',' + star.psf.sy);
            console.writeln("Star size=" + star.width);
            console.writeln("PSF angle=" + star.psf.angle);
         }
         Object.keys(star.psf).forEach(function (k) {
            var val = star.psf[k];
            if (doLog) console.writeln("PSF " + k + " = " + val);
            if (!isNaN(val)) {
               if (!me.psfValues[k]) me.psfValues[k] = [];
               me.psfValues[k].push(val);
            }
         });
         me.starsWithPSF.push(star);
      } else console.warningln(psfmsg);
   },
   recalculatePSF: function (stars, opts) {
      var me = this;
      var recalculatedStars = [];
      stars = stars || this.stars;
      opts = opts || {};
      var doUpdateProgress = opts.updateProgress === true;
      if (doUpdateProgress) {
         this.setStatus("Calculating PSF");
         this.updateProgress(0,0);
      }
      var detectPSFfThreshold = opts.detectPSFThreshold ||
                                this.opts.detectPSFThreshold;
      var psfThreshold = this.computePSFThreshold(detectPSFfThreshold);
      if (opts.forced) this.psfValues = {};
      var tot = stars.length;
      stars.forEach((star, i) => {
         processEvents();
         if (me.abortRequested) return recalculatedStars;
         if (doUpdateProgress) me.updateProgress(i + 1, tot);
         if (star.psf && !opts.forced) return;
         if (me.shouldDetectPSF(star, psfThreshold)) {
            me.getStarPSFData(star);
            if (star.psf) recalculatedStars.push(star);
         }
      });
      this.updatePSFStats();
      if (doUpdateProgress) {
         this.setStatus("Done");
      }
      return recalculatedStars;
   },
   updatePSFStats: function () {
      /* Update stats with PSF info */
      var psfAspectRatio = this.psfValues.aspectRatio;
      if (psfAspectRatio && psfAspectRatio.length > 0){
         if (!this.stats.psf) this.stats.psf = {};
         if (!this.stats.psf.aspectRatio) this.stats.psf.aspectRatio = {};
         this.stats.psf.aspectRatio.min = Math.minElem(psfAspectRatio);
         this.stats.psf.aspectRatio.max = Math.maxElem(psfAspectRatio);
         this.stats.psf.aspectRatio.avg = Math.mean(psfAspectRatio);
         this.stats.psf.aspectRatio.stdDev = Math.stdDev(psfAspectRatio);
      }
   },
   classifyStars: function () {
      this.printHeader("Classifing stars...");
      var verbose = this.opts.verbose;
      var bigStars = this.bigStars = [];
      var averageStars = this.averageStars = [];
      var smallStars = this.smallStars = [];
      var psfValues = this.psfValues = {};

      var stars = this.stars;
      var upLimit = this.sizeLimits.high;
      var downLimit = this.sizeLimits.low;
      var avgFlux = this.avgFlux;
      var me = this;
      var lview = this.luminanceView;
      this.starsWithPSF = [];

      var detectPSFfThreshold = this.opts.detectPSFThreshold;
      var psfThreshold = this.computePSFThreshold(detectPSFfThreshold);

      this.setStatus('Classifying stars');
      this.updateProgress(0,0);
      var me = this;
      stars.forEach(function (star, i) {
         processEvents();
         if (me.abortRequested) return;
         var perc = Math.round(((i+1) / stars.length) * 100);
         if (verbose > 1) {
            console.writeln('[' + (i + 1) + '/' + stars.length +
               ' ' + perc + '%] Star ' + star.id);
         }
         var do_get_psf = me.shouldDetectPSF(star, psfThreshold);
         var enlargementFactor = 1.2;
         if (star.size >= upLimit) {
            bigStars.push(star);
            enlargementFactor = areaEnlargementFactor.big;
         } else if (star.size <= downLimit) {
            smallStars.push(star);
         } else {
            averageStars.push(star);
            enlargementFactor = areaEnlargementFactor.average;
         }
         var side = star.width;
         side *= enlargementFactor;
         left = star.pos.x - (side / 2);
         top = star.pos.y - (side / 2);
         right = left + side;
         bottom = top + side;
         star.enlargedRect = new Rect(left, top, right, bottom);
         if (do_get_psf) {
            me.getStarPSFData(star);
         }
         me.updateProgress(i + 1, me.stars.length);
      });
      this.updatePSFStats();
   },
   createStarImage: function (stars, opts) {
      opts = opts || {};
      var mono = (opts.mono === true);
      var suffix = opts.suffix;
      if (!suffix) {
         if (stars == this.bigStars) suffix = 'BigStars';
         else if (stars == this.averageStars) suffix = 'AverageStars';
         else if (stars == this.smallStars) suffix = 'SmallStars';
         else if (stars.length === 1 && opts.starIDAsSuffix)
            suffix = stars[0].id;
      }
      if (stars.length === 0) {
         console.warningln("WARN: no stars" + (suffix ? ' ['+suffix+']' : ''));
         return null;
      }
      var new_win = null;
      if (!mono) new_win = this.cloneCurrentWindow(suffix);
      else {
         new_win = this.cloneWindow(this.luminanceView.window, suffix);
      }
      if (opts.hidden) new_win.hide();
      this.drawStars(new_win, stars, opts);
      if (opts.show !== false) {
         new_win.show();
         new_win.bringToFront();
      }
      return new_win;
   },
   createStarImages: function (opts) {
      var me = this;
      var img = this.srcImage;
      this.windows = this.windows || {};
      if (!opts) {
         opts = {
            bigStars: true,
            averageStars: true,
            smallStars: true,
         };
      }
      var maskopts = opts.mask;
      if (maskopts && opts.suffix) maskopts.suffix = opts.suffix;
      var createImg = function(imgstars, opts) {
         if (maskopts) return me.createStarMask(imgstars, maskopts);
         else return me.createStarImage(imgstars, opts);
      };

      if (opts.bigStars) {
         if (!this.bigStars) this.classifyStars();
         console.writeln("Big Stars:");
         var bigWin = createImg(this.bigStars);
         this.windows.bigStars = bigWin;
      }

      if (opts.averageStars) {
         if (!this.averageStars) this.classifyStars();
         console.writeln("Average Stars:");
         var avgStars = this.averageStars.filter(function (star) {
            return star.flux > me.minAllowedFlux;
         });
         var avgWin = createImg(avgStars);
         this.windows.averageStars = avgWin;
      }

      if (opts.smallStars) {
         if (!this.smallStars) this.classifyStars();
         console.writeln("Small Stars:");
         var smallWin = createImg(this.smallStars);
         this.windows.smallStars = smallWin;
      }

      if (opts.filters) {
         var filteredStars = null;
         opts.filters.forEach(function (filter) {
            var name = filter.name;
            var stars = (filter.chained ? filteredStars : me.stars);
            stars = stars || me.stars;
            if (!stars || stars.length === 0) return;
            if ((sizeClass = filter.sizeClass)) {
               name = name || 'Class_' + sizeClass;
               stars = me.sizeClasses[sizeClass];
            }
            if (!stars || stars.length === 0) return;
            if ((range = filter.range)) {
               var sizeRange = null, fluxRange = null, psfRange = null,
                   widthRange = null;
               if ((sizeRange = range.size)) {
                  sizeRange = me.getRangeValues(sizeRange, me.sizes);
                  console.writeln("Size range: " + sizeRange.min +
                     '-' + sizeRange.max);
               }
               if ((widthRange = range.width)) {
                  widthRange = me.getRangeValues(widthRange, me.widths);
                  console.writeln("Width range: " + widthRange.min +
                     '-' + widthRange.max);
               }
               if ((fluxRange = range.flux)) {
                  fluxRange = me.getRangeValues(fluxRange, me.fluxes);
                  console.writeln("Flux range: " + fluxRange.min +
                     '-' + fluxRange.max);
               }
               var include_missing_psf = false;
               if ((psfRange = range.psf)) {
                  if (!me.psfValues) me.classifyStars();
                  var origPsfRange = psfRange;
                  var include_missing = origPsfRange.includeMissingPSF;
                  delete origPsfRange.includeMissingPSF;
                  include_missing_psf = (include_missing === true);
                  psfRange = {};
                  Object.keys(origPsfRange).forEach(function (k) {
                     var krange = origPsfRange[k];
                     var values = me.psfValues[k];
                     if (!values) {
                        console.warningnl("No PSF values: " + k);
                        return;
                     }
                     krange = me.getRangeValues(krange, value);
                     krange.includeMissingPSF = include_missing;
                     console.writeln("PSF[" + k + "] range: " + krange.min +
                     '-' + krange.max);
                  });
               }
               stars = stars.filter(function (star) {
                  var ok = true;
                  if (sizeRange) {
                     var s = star.size;
                     ok = (s >= sizeRange.min && s <= sizeRange.max);
                     if (sizeRange.not) ok = !(ok);
                  }
                  if (!ok) return false;
                  if (widthRange) {
                     var w = star.width;
                     ok = (w >= widthRange.min && w <= widthRange.max);
                     if (widthRange.not) ok = !(ok);
                  }
                  if (!ok) return false;
                  if (fluxRange) {
                     var f = star.flux;
                     ok = (f >= fluxRange.min && f <= fluxRange.max);
                     if (fluxRange.not) ok = !(ok);
                  }
                  if (!ok) return false;
                  if (psfRange) {
                     var psf = star.psf;
                     if (psf) {
                        Object.keys(psfRange).forEach(function (k) {
                           if (!ok) return;
                           var krange = psfRange[k];
                           var val = psf[k];
                           if (val !== undefined)
                              ok = (val >= krange.min && val <= krange.max);
                           if (krange.not) ok = !(ok);
                        });
                     } else {
                        ok = include_missing_psf;
                     }
                  }
                  return ok;
               });
            }
            if (!stars || stars.length === 0) return;
            var func = null;
            if ((func = filter.func)){
               stars = stars.filter(func);
            }
            if (!stars || stars.length === 0) return;
            if (name) {
               console.writeln('filter_' + name + "_stars");
               if (!me.filteredStars) me.filteredStars = {};
               me.filteredStars[name] = stars;
            }
            var new_win = createImg(stars, {suffix: name});
            if (!new_win) return;
            name = name || new_win.mainView.id;
            me.windows[name] = new_win;
         });
      }
   },
   getRangeValues: function (range, values) {
      var min = range.min;
      var max = range.max;
      var minNum = null;
      var maxNum = null;
      if (values === this.sizes) {
         minNum = this.minSize;
         maxNum = this.maxSize;
      } else if (values === this.widths) {
         minNum = this.minWidth;
         maxNum = this.maxWidth;
      }
      minNum = minNum || Math.minElem(values) || 0;
      maxNum = maxNum || Math.maxElem(values) || 0;
      if (typeof(min) === 'string' && (match = min.match(/([\d\.\+-]+)%/))) {
         var perc = parseFloat(match[1]) / 100;
         min = (perc * (maxNum - minNum)) + minNum;
      }
      if (typeof(max) === 'string' && (match = max.match(/([\d\.\+-]+)%/))) {
         var perc = parseFloat(match[1]) / 100;
         max = (perc * (maxNum - minNum)) + minNum;
      }
      min = min || 0;
      max = max || maxNum || 0;
      return {min: min, max: max, not: range.not};
   },
   getValueByPercentage: function (percentage, values) {
      var min = null, max = null;
      var perc = parseFloat(percentage) / 100;
      if (values === this.sizes) {
         min = this.minSize;
         max = this.maxSize;
      } else if (values === this.widths) {
         min = this.minWidth;
         max = this.maxWidth;
      } else if (values === this.fluxes) {
         min = this.minFlux;
         max = this.maxFlux;
      }
      if (!min && min !== 0) min = Math.minElem(values);
      if (!max && max !== 0) max = Math.maxElem(values);
      return (perc * (max - min)) + min;
   },
   printStats: function () {
      if (this.avgSize === undefined) return;
      var sizes = this.sizes;
      console.writeln("Avg Size: " + this.avgSize +
         ' (side: ' + Math.sqrt(this.avgSize) + ')');
      console.writeln("Median Size: " + this.medianSize +
         ' (side: ' + Math.sqrt(this.medianSize) + ')');
      console.writeln("Max Size: " + this.maxSize +
         ' (side: ' + this.maxSize + ')');
      console.writeln("Size StdDev: " + this.sizeStdDev +
         ' (side: ' + Math.sqrt(this.sizeStdDev) + ')');
      console.writeln("Size AvgDev: " + this.sizeAvgDev);
      console.writeln("Size MAD: " + this.sizeMAD);
      console.writeln("Size 2SIDE MAD: " + Math.twoSidedMAD(sizes).join('-'));
      console.writeln("Size 2SIDE AvgDev: " + Math.twoSidedAvgDev(sizes).join('-'));

      console.writeln("Size Classes:");
      Object.keys(this.sizeClasses).forEach(function (cls) {
         console.writeln('  ' + cls + ': ' + this.sizeClasses[cls].length);
      });
      console.writeln("Avg Flux: " + this.avgFlux);
      console.writeln("Flux StdDev: " + this.fluxStdDev);
      console.writeln("Flux AvgDev: " + this.fluxAvgDev);
   },
   printHeader: function (str) {
      str = '===== ' + str + ' =====';
      console.writeln(consoleFormattedString(str, {bold: true}));
   },
   logStar: function (star) {
      Object.keys(star).forEach(function (k) {
         var val = star[k];
         console.write(" - " + k + ": [" + typeof(val) + '] ');
         if (k === 'pos') console.write(val.x + ', ' + val.y);
         else console.write(val.toString());
         console.writeln('');
      });
   },
   saveLog: function (filepath) {
      if (!this.log) {
         console.warningln("No log to save!");
         return;
      }
      if (this.log.stars) {
         this.log.stars = this.log.stars.map(function (star) {
            var star2log = {};
            Object.keys(star).forEach(function (k) {
               var val = star[k];
               if (val instanceof Rect) {
                  star2log[k] = {x: val.left, y: val.top, width: val.width,
                             height: val.height};
               } else if (val instanceof Point) {
                  star2log[k] = {x: val.x, y: val.y};
               } else star2log[k] = val;
            });
            return star2log;
         });
      }
      var log = JSON.stringify(this.log, null, 4);
      File.writeTextFile(filepath, log);
      console.noteln("Log saved to: " + filepath);
   },
   cloneWindow: function (win, suffix, opts) {
      opts = opts || {};
      var img = win.mainView.image;
      var is_temp = (opts.temporary === true);
      if (!suffix) {
         suffix = 'tmp_' + randomID();
         is_temp = true;
      }
      var new_w = new ImageWindow(img.width, img.height, img.numberOfChannels,
         img.bitsPerSample, win.isFloatSample, img.isColor );
      new_w.mainView.id = win.mainView.id + '_' + suffix;
      if (opts.copyImage) {
         new_w.mainView.beginProcess(UndoFlag_NoSwapFile);
         new_w.mainView.assign(img);
         new_w.mainView.endProcess();
      }
      if (is_temp) this.temporaryWindows.push(new_w);
      return new_w;
   },
   cloneCurrentWindow: function (suffix, opts) {
      return this.cloneWindow(this.win, suffix, opts);
   },
   drawStars: function (destwin, stars, opts) {
      opts = opts || {};
      var minflux = opts.minAllowedFlux;
      var mono = (opts.mono === true);
      var me = this;
      var img = (!mono ? this.srcImage : this.luminanceView.image);
      destwin.mainView.beginProcess(UndoFlag_NoSwapFile);
      stars.forEach(function (star, i) {
         //console.writeln(star.id + " - W: " + star.rect.width);
         if (minflux && star.flux < minflux) {
            console.warningln("  WARN: flux less than " + minflux);
            return;
         }
         me.drawStar(star, img, destwin);
      });
      destwin.mainView.endProcess();
   },
   createLuminanceImage: function (view, id) {
      if (!id) id = view.id + '_' + randomID() + '_L';
      var P = new PixelMath;
      P.expression = "CIEL($T)";
      P.expression1 = "";
      P.expression2 = "";
      P.expression3 = "";
      P.useSingleExpression = true;
      P.symbols = "";
      P.generateOutput = true;
      P.singleThreaded = false;
      P.optimization = true;
      P.use64BitWorkingImage = false;
      P.rescale = false;
      P.rescaleLower = 0;
      P.rescaleUpper = 1;
      P.truncate = true;
      P.truncateLower = 0;
      P.truncateUpper = 1;
      P.createNewImage = true;
      P.showNewImage = true;
      P.newImageId = id;
      P.newImageWidth = 0;
      P.newImageHeight = 0;
      P.newImageAlpha = false;
      P.newImageColorSpace = PixelMath.prototype.Gray;
      P.newImageSampleFormat = PixelMath.prototype.SameAsTarget;
      /*
       * Read-only properties
       *
      P.outputData = [ // globalVariableId, globalVariableRK, globalVariableG, globalVariableB
      ];
       */
      P.executeOn(view);
      var new_view = View.viewById(id);
      new_view.window.hide();
      return new_view;
   },
   detectPSF: function (star, view, opts) {
      opts = opts || {};
      var r = star.rect;
      var d = r.width / 2;
      r = new Rect(r.x0 - d, r.y0 - d, r.x1 + d, r.y1 + d);
      var radius =  r.width * 2;
      if (radius > 127) radius = 127; // Max allowed searchRadius
      var P = new DynamicPSF;
      var views = new Array;
      views.push(new Array(view.id));
      P.views = views;
      //P.views[0] = view.id;
      P.searchRadius = radius;
      P.regenerate = true;
      P.stars = [ // viewIndex, channel, status, x0, y0, x1, y1, x, y
         [0, 0, DynamicPSF.prototype.Star_DetectedOk, r.x0, r.y0, r.x1, r.y1, star.pos.x, star.pos.y],
      ];
      /*P.psf = [ // starIndex, function, circular, status, B, A, cx, cy, sx, sy, theta, beta, mad, celestial, alpha, delta, flux, meanSignal
         [0, DynamicPSF.prototype.Function_Gaussian, false, DynamicPSF.prototype.PSF_FittedOk, 0.003789, 0.854001, 16.00, 17.15, 4.974, 4.604, 94.04, 2.00, 2.643e-02, false, 0.00000000, 0.00000000, 6.145e+01, 4.337e-01],
         [1, DynamicPSF.prototype.Function_Gaussian, false, DynamicPSF.prototype.PSF_FittedOk, 0.001583, 0.852104, 16.19, 18.15, 5.881, 5.123, 106.64, 2.00, 3.011e-02, false, 0.00000000, 0.00000000, 8.065e+01, 4.327e-01],
         [2, DynamicPSF.prototype.Function_Gaussian, false, DynamicPSF.prototype.PSF_FittedOk, 0.000000, 0.738877, 16.32, 18.56, 6.294, 5.328, 104.56, 2.00, 3.206e-02, false, 0.00000000, 0.00000000, 7.963e+01, 3.861e-01]
      ];*/
      P.autoPSF = true;
      P.circularPSF = false;
      P.gaussianPSF = false;
      P.signedAngles = false;
      P.autoVariableShapePSF = false;
      P.autoAperture = opts.autoAperture !== false;
      /*
      P.moffatPSF = false;
      P.moffat10PSF = false;
      P.moffat8PSF = false;
      P.moffat6PSF = false;
      P.moffat4PSF = false;
      P.moffat25PSF = false;
      P.moffat15PSF = false;
      P.lorentzianPSF = false;
      P.variableShapePSF = false;
      P.autoVariableShapePSF = false;
      P.betaMin = 1.00;
      P.betaMax = 4.00;
      P.signedAngles = true;
      P.regenerate = true;
      P.astrometry = true;

      P.threshold = 1.00;

      P.scaleMode = DynamicPSF.prototype.Scale_Pixels;*/

      /*P.scaleValue = 1.00;
      P.scaleKeyword = "";
      P.starColor = 4292927712;
      P.selectedStarColor = 4278255360;
      P.selectedStarFillColor = 0;
      P.badStarColor = 4294901760;
      P.badStarFillColor = 2164195328;*/

     var scale = P.scaleValue || 1.0;
     var varshape = (P.variableShapePSF === true);

      P.executeGlobal();
      var psf = [];
      P.psf.forEach(function (row) {
            // starIndex, function, circular, status, B, A, cx, cy, sx, sy, theta, beta, mad, celestial, alpha, delta, flux, meanSignal
            var fwhm = {
               x: FWHM(row[1], row[8], row[11], varshape),
               y: FWHM(row[1], row[9], row[11], varshape),
            };
            psf.push({
               func: row[1],
               circular: row[2],
               status: row[3],
               B: row[4],
               A: row[5],
               cx: row[6],
               cy: row[7],
               sx: row[8],
               sy: row[9],
               theta: row[10],
               angle: row[10], // Not signed, usable for Deconvolution
               beta: row[11],
               mad: row[12],
               celestial: row[13],
               alpha: row[14],
               delta: row[15],
               flux: row[16],
               meanSignal: row[17],
               aspectRatio: row[9] / row[8], // 1 = perfect circle, < 1 rounded circle
               FWHMx: fwhm.x,
               FWHMy: fwhm.y,
            });
      });
      return psf;
   },
   drawStar: function (star, srcimg, win, enlarged) {
      enlarged = (enlarged !== false);
      var r = (enlarged ? star.enlargedRect : star.rect);
      var pos = new Point(r.x0, r.y0);
      win.mainView.image.apply(srcimg, ImageOp_Add, pos, -1, r);
   },
   createPreviewFromStar: function (star, enlarged) {
         var win = this.win;
         enlarged = (enlarged !== false);
         var r = (enlarged ? star.enlargedRect : star.rect);
         var preview = win.createPreview(r, star.id);
         this.previews = this.previews || [];
         this.previews.push(preview);
         star.preview = preview;
         return preview;
   },
   abort: function () {
      this.abortRequested = true;
   },
   fixElongatedStar: function (star, win, opts) {
      opts = opts || {};
      win = win || this.win;
      var view = win.mainView;
      var maxStdDev = opts.maxStdDev || 8;
      var deringing = (opts.deringing !== false);
      var deringingScale = opts.deringingScale || 1;
      var fixFactor = opts.fixFactor || 1;
      var processContainer = opts.processContainer;
      var psf = star.psf;
      if (!psf) {
         console.warningln("Cannot fix elongated star " + star.id +
            ": Missing PSF");
         return;
      }
      var fixLen = 1.5 * (1 / psf.aspectRatio) * fixFactor;
      var structSize = 5;
      if (star.width >= 9) structSize = 9;
      else if (star.width >= 7) structSize = 7;
      var convolution = star.width / 4;
      if (convolution < 2) convolution = 2;
      var mask = this.createStarMask([star], {
         binarize: true,
         dilation: structSize,
         convolution : convolution,
         hidden: true,
         temporary: (processContainer ? true : false),
         starIDAsSuffix: true,
      });
      if (!mask) {
         console.warningnl("Failed to create mask for star " + star.id);
      }
      mask.hide();
      var wasProcessing = view.processing;
      if (!wasProcessing) view.beginProcess(UndoFlag_NoSwapFile);
      win.maskVisible = false;
      win.setMask(mask);
      var sx = psf.sx;
      if (psf.FWHMx && sx) {
         /* With some PSF functions (ie. Moffat functions), sx could be too
          * high. We generally assume that sx is a good measure for
          * deconvolution length and/or stddev onyl when FWHM is about two
          * times bigger than sx. */
         let xr = psf.FWHMx / sx;
         if (Math.round(xr) < 2) {
            if (xr > 1) xr = (1 / xr);
            sx /= (2 * xr);
         }
      }
      var stdDev = sx;
      if (stdDev > maxStdDev) stdDev = maxStdDev;
      var motionLength = sx * fixLen;
      if (motionLength > 100) motionLength = 100;
      var deringingDark = (stdDev * deringingScale) / 1000;
      console.writeln("Fix elongated star " + star.id + ", StdDev: " + stdDev +
         ", Angle: " + psf.angle);
      var processOpts = {processContainer: processContainer};
      this.convolution(view, stdDev, processOpts);
      this.motionDeconvolution(view, motionLength, psf.angle, processOpts);
      this.deconvolution(view, stdDev, {
            deringing: deringing,
            deringingDark: deringingDark,
            processContainer: processContainer
      });
      if (processContainer && processContainer.length >= 3)
         processContainer.setMask(processContainer.length - 3, mask);
      win.removeMask();
      if (!wasProcessing) view.endProcess();
      var maskWindow = opts.maskWindow;
      if (maskWindow) {
         maskWindow.mainView.beginProcess(UndoFlag_NoSwapFile);
         maskWindow.mainView.image.apply(mask.mainView.image, ImageOp_Max);
         maskWindow.mainView.endProcess();
      }
      if (this.log) {
         if (!this.log.fixElongatedStar) this.log.fixElongatedStar = {}
         this.log.fixElongatedStar[star.id] = {
            convolution: {stdDev: stdDev},
            motionDeconvolution: {len: motionLength, angle: psf.angle},
            deconvolution: {stdDev: stdDev, deringing: deringing,
                            deringingDark: deringingDark},
            mask: {
               binarize: true,
               dilation: structSize,
               convolution : convolution,
            }
         };
      }
      if (!processContainer) mask.forceClose();
   },
   fixElongatedStars: function (opts) {
      opts = opts || {};
      var threshold = opts.threshold || 0.9;
      var win = opts.win || this.win;
      var origWin = win;
      if (opts.atomic !== false) {
         win = this.cloneCurrentWindow();
         win.hide();
         win.mainView.beginProcess(UndoFlag_NoSwapFile);
         win.mainView.image.assign(origWin.mainView.image);
         win.mainView.endProcess();
      }
      if (!this.stars) {
         this.analyzeStars();
         this.setLimits();
         this.classifyStars();
      }
      var stars = this.starsWithPSF;
      if (opts.filter) stars = stars.filter(opts.filter);
      var len = stars.length;
      if (len === 0) return;
      var me = this;
      var mask = null;
      if (opts.keepMask) {
         if (!this.elongatedStarsMasks) this.elongatedStarsMasks = [];
         mask = this.cloneWindow(this.luminanceView.window,
            win.mainView.id + '_ElongatedStarMask');
         mask.hide();
         this.elongatedStarsMasks.push(mask);
         opts.maskWindow = mask;
      }
      this.setStatus('Fixing elongated stars');
      this.updateProgress(0,0);
      win.mainView.beginProcess(UndoFlag_NoSwapFile);
      stars.forEach(function (star, i) {
         processEvents();
         if (me.abortRequested) return;
         var idx = i + 1;
         var perc = Math.round((idx / len) * 100);
         var logprfx = '[' + idx + '/' + len + ' ' + perc + '%]';
         me.updateProgress(idx, len);
         var psf = star.psf;
         if (!psf) return;
         var r = psf.aspectRatio;
         if (r >= threshold) {
            console.warningln(logprfx + ' star ' + star.id +
               ' above threshold (' + r + ')');
            return;
         }
         if (star.size < me.avgSize) {
            console.warningln(logprfx  + ' star '+star.id+' size below avg');
            return;
         }
         console.note(logprfx);
         console.note(' Fixing elongated star '+ star.id);
         console.noteln(' (' + r + ')');
         me.fixElongatedStar(star, win, opts);
         gc(false);
      });
      win.mainView.endProcess();
      if (win != origWin) {
         origWin.mainView.beginProcess();
         origWin.mainView.image.assign(win.mainView.image);
         origWin.mainView.endProcess();
         win.forceClose();
         win = origWin;
      }
      this.setStatus('Done');
      if (mask) mask.show();
      win.bringToFront();
   },
   reduceStars: function (stars, win, opts) {
      win = win || this.win;
      opts = opts || {};
      var selection = opts.selection || 0.25;
      if (selection > 0.45) selection = 0.45;
      var processContainer = opts.processContainer;
      var me = this;
      if (!stars) {
         stars = this.stars;
         if (!stars) {
            this.analyzeStars();
            this.setLimits();
            this.classifyStars();
         }
         stars = stars.filter(function (star) {
            return star.size > me.avgSize;
         });
      }
      var structSizes = Object.keys(MorphologicalTransformationMasks);
      var maxStructSize = Math.maxElem(structSizes.map(function (s) {
         return parseInt(s);
      }));
      var len = stars.length;
      var groups = {};
      stars.forEach(function (star, idx) {
         var w = star.width;
         var starStructSize = null;
         for (i = 0; i < structSizes.length; i++) {
            var s = structSizes[i];
            var maxw = parseInt(s) * 3;
            if (w <= maxw) {
               starStructSize = s;
               break;
            }
         }
         starStructSize = starStructSize || (maxStructSize + '');
         if (!groups[starStructSize]) groups[starStructSize] = [];
         groups[starStructSize].push(star);
      });
      var view = win.mainView;
      var origSelection = selection;
      this.setStatus('Reducing stars');
      this.updateProgress(0, 0);
      var processed = 0;
      var processOpts = {processContainer: processContainer};
      Object.keys(groups).forEach(function (structureSize) {
         processEvents();
         if (me.abortRequested) return;
         var gstars = groups[structureSize];
         processed += gstars.length;
         var mask = me.createStarMask(gstars, {
            binarize: true,
            dilation: structureSize,
            convolution : true,
            hidden: true,
            temporary: (processContainer ? true : false),
         });
         if (!mask) {
            console.warningnl("Failed to create mask for star " + star.id);
            return;
         }
         mask.hide();
         if (opts.selectionScale !== false) {
            var amount = 0.5 - origSelection;
            var r = (parseInt(structureSize) / parseInt(maxStructSize));
            selection = 0.5 - (r * amount);
         }
         var wasProcessing = view.processing;
         if (!wasProcessing) view.beginProcess(UndoFlag_NoSwapFile);
         win.maskVisible = false;
         win.setMask(mask);
         me.morphologicalErosion(view, structureSize, selection, processOpts);
         if (processContainer && processContainer.length > 0)
            processContainer.setMask(processContainer.length - 1, mask);
         win.removeMask();
         if (!wasProcessing) view.endProcess();
         me.updateProgress(processed, len);
         if (!processContainer) mask.forceClose();
      });
      this.setStatus('Done');
   },
   motionDeconvolution: function (view, length, angle, opts) {
      opts = opts || {};
      var processContainer = opts.processContainer;
      var P = new Deconvolution;
      P.algorithm = Deconvolution.prototype.RichardsonLucy;
      P.numberOfIterations = 10;
      P.deringing = false;
      P.deringingDark = 0.1000;
      P.deringingBright = 0.0000;
      P.deringingSupport = false;
      P.deringingSupportAmount = 0.70;
      P.deringingSupportViewId = "";
      P.toLuminance = true;
      P.psfMode = Deconvolution.prototype.MotionBlur;
      P.psfSigma = 7.00;
      P.psfShape = 2.00;
      P.psfAspectRatio = 1.00;
      P.psfRotationAngle = 0.00;
      P.psfMotionLength = length;
      P.psfMotionRotationAngle = angle;
      P.psfViewId = "";
      P.psfFFTSizeLimit = 15;
      P.useRegularization = true;
      P.waveletLayers = [ // noiseThreshold, noiseReduction
         [3.00, 1.00],
         [2.00, 0.70],
         [1.00, 0.70],
         [1.00, 0.70],
         [1.00, 0.70]
      ];
      P.noiseModel = Deconvolution.prototype.Gaussian;
      P.numberOfWaveletLayers = 2;
      P.scalingFunction = Deconvolution.prototype.B3Spline5x5;
      P.convergence = 0.0000;
      P.rangeLow = 0.0000000;
      P.rangeHigh = 0.0000000;
      P.iterations = [ // count
         [10],
         [0],
         [0]
      ];
      if (processContainer) processContainer.add(P);
      P.executeOn(view, false);
   },
   deconvolution: function (view, stdDev, opts) {
      if (stdDev > 10) stdDev = 10;
      opts = opts || {};
      var shape = opts.shape;
      var ratio = opts.ratio;
      var deringingDark = opts.deringingDark || 0.1000;
      var processContainer = opts.processContainer;
      var P = new Deconvolution;
      P.algorithm = Deconvolution.prototype.RichardsonLucy;
      P.numberOfIterations = 10;
      P.deringing = (opts.deringing === true);
      P.deringingDark = deringingDark;
      P.deringingBright = 0.0000;
      P.deringingSupport = false;
      P.deringingSupportAmount = 0.70;
      P.deringingSupportViewId = "";
      P.toLuminance = true;
      P.psfMode = Deconvolution.prototype.Parametric;
      P.psfSigma = stdDev;
      P.psfShape = shape || 2.00;
      P.psfAspectRatio = ratio || 1.00;
      P.psfRotationAngle = 0.00;
      P.psfMotionLength = 5.00;
      P.psfMotionRotationAngle = 115.00;
      P.psfViewId = "";
      P.psfFFTSizeLimit = 15;
      P.useRegularization = true;
      P.waveletLayers = [ // noiseThreshold, noiseReduction
         [3.00, 1.00],
         [2.00, 0.70],
         [1.00, 0.70],
         [1.00, 0.70],
         [1.00, 0.70]
      ];
      P.noiseModel = Deconvolution.prototype.Gaussian;
      P.numberOfWaveletLayers = 2;
      P.scalingFunction = Deconvolution.prototype.B3Spline5x5;
      P.convergence = 0.0000;
      P.rangeLow = 0.0000000;
      P.rangeHigh = 0.0000000;
      P.iterations = [ // count
         [10],
         [0],
         [0]
      ];
      if (processContainer) processContainer.add(P);
      P.executeOn(view, false);

   },
   convolution: function (view, stdDev, opts) {
      opts = opts || {};
      var shape = opts.shape;
      var ratio = opts.ratio;
      var processContainer = opts.processContainer;
      var P = new Convolution;
      P.mode = Convolution.prototype.Parametric;
      P.sigma = stdDev;
      P.shape = shape || 2.00;
      P.aspectRatio = ratio || 1.00;
      P.rotationAngle = 0.00;
      P.filterSource = "";
      P.rescaleHighPass = false;
      P.viewId = "";
      if (processContainer) processContainer.add(P);
      P.executeOn(view, false);
   },
   morphologicalDilation: function (view, structureSize, opts) {
      opts = opts || {};
      var processContainer = opts.processContainer;
      if (structureSize === true) structureSize = 0;
      structureSize = structureSize || 5;
      structureSize = parseInt(structureSize);
      var sizeKey = '' + structureSize;
      var masks = MorphologicalTransformationMasks;
      var mask = masks[sizeKey];
      if (!mask) {
         console.criticalln("Invalid structire size " + sizeKey);
         return;
      }
      var P = new MorphologicalTransformation;
      P.operator = MorphologicalTransformation.prototype.Dilation;
      P.interlacingDistance = 1;
      P.lowThreshold = 0.000000;
      P.highThreshold = 0.000000;
      P.numberOfIterations = 1;
      P.amount = 1.00;
      P.selectionPoint = 0.50;
      P.structureName = structureSize + 'x' + structureSize +
         " Circular Structure";
      P.structureSize = structureSize;
      P.structureWayTable = [[mask]];// mask
      if (processContainer) processContainer.add(P);
      P.executeOn(view);
   },
   morphologicalErosion: function (view, structureSize, selection, opts) {
      opts = opts || {};
      var processContainer = opts.processContainer;
      structureSize = structureSize || 5;
      var sizeKey = '' + structureSize;
      var masks = MorphologicalTransformationMasks;
      var mask = masks[sizeKey];
      if (!mask) {
         console.criticalln("Invalid structire size " + sizeKey);
         return;
      }
      var op = MorphologicalTransformation.prototype.Erosion;
      if (selection !== false) {
         op = MorphologicalTransformation.prototype.Selection;
         if (isNaN(selection)) selection = 0.25;
      }
      var P = new MorphologicalTransformation;
      P.operator = op;
      P.interlacingDistance = 1;
      P.lowThreshold = 0.000000;
      P.highThreshold = 0.000000;
      P.numberOfIterations = 1;
      P.amount = 1.00;
      P.selectionPoint = selection;
      P.structureName = structureSize + 'x' + structureSize +
         " Circular Structure";
      P.structureSize = parseInt(structureSize);
      P.structureWayTable = [[mask]];// mask
      if (processContainer) processContainer.add(P);
      P.executeOn(view);
   },
   binarize: function (view, threshold, opts) {
      opts = opts || {};
      var processContainer = opts.processContainer;
      threshold = threshold || 0.5;
      var P = new Binarize;
      P.thresholdRK = threshold;
      P.thresholdG = threshold;
      P.thresholdB = threshold;
      P.isGlobal = true;
      if (processContainer) processContainer.add(P);
      P.executeOn(view);
   },
   getWindowBmp: function (win) {
      win = win || this.win;
      var imageOrg = win.mainView.image;
      var tmpW = null;
      try
      {
         tmpW = new ImageWindow(imageOrg.width, imageOrg.height, imageOrg.numberOfChannels,
            win.bitsPerSample, win.isFloatSample, imageOrg.isColor, "Aux");
         tmpW.mainView.beginProcess(UndoFlag_NoSwapFile);
         tmpW.mainView.image.apply(imageOrg);
         tmpW.mainView.endProcess();
         var bmp = new Bitmap(imageOrg.width, imageOrg.height);
         bmp.assign(tmpW.mainView.image.render());
         return bmp;
      } finally
      {
         tmpW.forceClose();
      }
   },
   createStarMask: function (stars, opts) {
      opts = opts || {};
      opts.mono = true;
      if (!this.masks) this.masks = [];
      var mask = this.createStarImage(stars, opts);
      if (opts.hidden) mask.hide();
      if (!mask) return null;
      var postprocess = opts.binarize || opts.dilation || opts.convolution;
      var view = mask.mainView;
      if (postprocess) view.beginProcess(UndoFlag_NoSwapFile);
      if (opts.binarize) this.binarize(view, 0.1);
      if (opts.dilation) {
         var structSize = (!isNaN(opts.dilation) ? opts.dilation : null);
         if (structSize === true) structSize = 0;
         this.morphologicalDilation(view, structSize);
      }
      if (opts.convolution) {
         var stdDev = (!isNaN(opts.convolution) ? opts.convolution : null);
         if (stdDev === true) stdDev = null;
         stdDev = stdDev || 2;
         this.convolution(view, stdDev);
      }
      if (postprocess) view.endProcess();
      if (opts.suffix) this.masks.push(mask);
      return mask;
   },
   createAnnotatedWindow: function (stars, opts) {
      opts = opts || {};
      var win = opts.win || this.win;
      if (!this.annotatedWindows) this.annotatedWindows = [];
      var color = opts.color || 0xff00ff00;
      var psfColor = opts.psfColor || color;
      var crossAirColor = opts.psfCrossAirColor || 0xff660066;
      var penWidth = opts.penWidth || 1;
      var bmp = this.getWindowBmp(win);
      var g = new VectorGraphics(bmp);
      g.antialiasing = true;
      var me = this;
      stars.forEach(function (star) {
         var r = (opts.enlargedRect ? star.enlargedRect : star.rect);
         var cbk = opts.onDraw;
         var style = {color: color, penWidth: penWidth};
         if (cbk) cbk.call(me, star, style);
         if (style.draw === false) return;
         g.pen = new Pen(style.color, style.penWidth,
            PenStyle_Solid, PenCap_Round);
         g.drawRect(r);
         if (style.drawPSF !== false && star.psf) {
            g.transformationEnabled = true;
            let w = star.psf.FWHMx, h = star.psf.FWHMy,
                x = star.psf.cx, y = star.psf.cy,
                crossair_size = (star.psf.sx / 2);
            var ellipseRect = new Rect(-w/2, -h/2, w/2, h/2);
            g.pushState();
            if (psfColor !== color) {
               g.pen = new Pen(psfColor, style.penWidth,
                  PenStyle_Solid, PenCap_Round);
            }
            g.translateTransformation(x, y);
            g.rotateTransformation((star.psf.angle || 0) * Math.PI / 180);
            g.drawEllipse(ellipseRect);
            /* Draw Centroid Cross-air */
            g.pushState();
            g.pen = new Pen(crossAirColor, style.penWidth,
               PenStyle_Solid, PenCap_Round);
            g.drawLine(-crossair_size, 0, crossair_size, 0);
            g.drawLine(0, -crossair_size, 0, crossair_size);
            g.popState();
            g.resetTransformation();
            g.popState();
         }
         if (style.drawText !== false) {
            var txt = style.text || star.id;
            var txt_at = new Point(r.x0, r.bottom + 15);
            if (txt_at.y >= win.mainView.image.height) txt_at.y = r.top - 35;
            g.drawText(txt_at, txt);
         }
      });
      g.end();
      if (opts.returnBitmap) return bmp;
      var awin = this.cloneWindow(win, opts.suffix);
      if (!awin) return null;
      this.annotatedWindows.push(awin);
      awin.mainView.beginProcess(UndoFlag_NoSwapFile);
      awin.mainView.image.blend(bmp);
      awin.mainView.endProcess();
      awin.show();
      awin.bringToFront();
      return awin;
   },
   displayUndetectedStars: function (opts) {
      if (!this.stars) this.analyzeStars();
      opts = opts || {};
      var srcwin = opts.mono ? this.luminanceView.window : this.win;
      var new_win = this.cloneWindow(srcwin, 'UndetectedStars', opts);
      new_win.hide();
      var srcimg = srcwin.mainView.image;
      new_win.mainView.beginProcess(UndoFlag_NoSwapFile);
      new_win.mainView.image.assign(srcimg);
      this.stars.forEach(function (star) {
         var r = star.rect;
         var pos = new Point(r.x0, r.y0);
         new_win.mainView.image.apply(srcimg, ImageOp_Sub, pos, -1, r);
      });
      new_win.mainView.endProcess();
      new_win.show();
      new_win.bringToFront();
      return new_win;
   },
   getTempFile: function (filename) {
      return File.systemTempDirectory + '/' + filename;
   },
   drawPlot: function (feature, opts) {
      opts = opts || {};
      var gnuplotExe = this.gnuplotExecutable;
      if (!gnuplotExe) {
         var binpath = coreBinDirPath;
         var gnuplot = binpath + '/gnuplot';
         if (!File.exists(gnuplot)) gnuplot = binpath + '/gnuplot.exe';
         if (!File.exists(gnuplot)) {
            console.criticalln("Failed to find gnuplot executable in:");
            console.criticalln(File.extractDirectory(gnuplot));
            return {
               created: false,
               error: "Unable to find gnuplot executable!"
            };
         }
         var tmppath = File.systemTempDirectory + '/' +
            File.extractName(gnuplot);
         if (!File.exists(tmppath)) File.copyFile(tmppath, gnuplot)
         gnuplotExe = this.gnuplotExecutable = tmppath;
      }
      var data = null;
      var featureName = feature.toLowerCase().replace(/\.+/g, '_');
      var objName = null, property = feature;
      if (feature.indexOf('.') > 0) {
         var components = feature.split('.');
         objName = components[0];
         property = components[1];
      }
      var sorted = this.sortStarsBy(feature);
      if (sorted.length === 0) {
         console.warningln("drawPlot: no data found for " + feature);
         return {
            created: false,
            error: "No data"
         };
      }
      var sorted_data = [];
      sorted.forEach((star, i) => {
         var value =
            (objName ? (star[objName] || {})[property] : star[feature]);
         sorted_data.push([i, value]);
      });
      var xLabel = opts.xLabel;
      var yLabel = opts.yLabel;
      var grouped = opts.grouped;
      var xtic = null;
      if (grouped) {
         var grpOpts = {};
         if (!isNaN(grouped)) {
            grpOpts.interval = grouped;
            xtic = grouped;
         }
         var groups = this.groupStars(feature, grpOpts);
         var keys = Object.keys(groups).sort((a, b) => {return a - b});
         if (keys.length === 0) {
            console.warningln("drawPlot: no groups for " + feature);
            return {
               created: false,
               error: "No groups"
            };
         };
         data = [];
         keys.forEach((k) => {
            var count = groups[k].length;
            var fmt = '%.2f';
            k = parseFloat(k);
            if ((k % parseInt(k)) === 0) fmt = '%d';
            k = format(fmt, k);
            data.push([k, count]);
         });
         xLabel = xLabel || capitalizedString(feature);
         yLabel = yLabel || 'Count';
      } else {
         data = sorted_data;
         xLabel = xLabel || 'Stars';
         yLabel = yLabel || capitalizedString(feature);
      }
      if (!data) return null;
      var writeStatsFile = (data !== sorted_data);
      data = data.map(values => values.join(' ')).join("\n");
      var dataFile = this.getTempFile('stars_' + featureName + '.dat');
      var statsDataFile = dataFile;
      var scriptFile = this.getTempFile('stars_' + featureName + '.plt');
      var statColumn = 2;
      File.writeTextFile(dataFile, data);
      if (writeStatsFile) {
         sorted_data = sorted_data.map(values => values.join(' ')).join("\n");
         statsDataFile =
            this.getTempFile('stars_' + featureName + '.values.dat');
         File.writeTextFile(statsDataFile, sorted_data);
         //statColumn = 1;
      }
      var bgCol = opts.backgroundColor || 'white';
      var width = opts.width || 600;
      var height = opts.height || 500;
      var font = opts.font || {};
      var fontName = font.name || 'Helvetica';
      var fontSize = font.size || 10;
      var imageFile = opts.imageFile ||
         this.getTempFile("star_" + featureName + "_graph.svg");
      var title = opts.title ||
         ("Star " + feature + (grouped ? ' (Grouped)' : ''));
      var script = ["set terminal svg size " + width + ',' + height +
         " enhanced background rgb '" + bgCol + "' font \"" + fontName +
         ',' + fontSize + '"'];
      if (opts.verbose) script.push('set print "-"');
      script.push('set output "' + imageFile + '"');
      script.push('set title font "' + fontName + ',' + (fontSize * 2) +
         '" enhanced "' + title + '"');
      script.push('set xlabel "' + xLabel + '"');
      script.push('set ylabel "' + yLabel + '"');
      if (xtic) script.push('set xtic ' + xtic);
      script.push('stats "' + statsDataFile + '" using ' + statColumn +
         ' output name "' + featureName + '"');
      var vars = [['stddev_high', '$mean + $stddev'],
                  ['stddev_low', '$mean - $stddev']];
      var statLineVars = ['mean'];
      vars.forEach(vardef => {
         var varname = vardef[0];
         var expr = vardef[1];
         statLineVars.push(varname);
         expr = expr.replace(/\$/g, featureName + '_');
         script.push(featureName + '_' + varname + ' = ' + expr);
      });
      /* Draw statistical lines */
      var varCount = 0;
      statLineVars.forEach(function (varname, i) {
         var is_mean = varname === 'mean';
         var col = is_mean ? '#666666' : '#aaaaaa';
         var label = null;
         if (varname.indexOf('stddev_') === 0) label = 'σ';
         label = label || capitalizedString(varname);
         varname = featureName + '_' + varname;
         if (grouped) {
            script.push('set arrow ' + (i+1) + ' from ' + varname +
               ', graph 0.0 to ' + varname + ', graph 1.0 nohead fill lc \'' +
               col + "'");
            script.push('set label ' +(i+1)+ ' at ' + varname + ', graph 1.0 "'+
               label + '" center offset 0,1');
         } else {
            script.push('set arrow ' + (i+1) + ' from graph 0.0,first ' +
               varname + ' to graph 1.0,first ' + varname +
               ' nohead fill lc \'' + col + "'");
            script.push('set label ' +(i+1)+ ' at graph 1.0,first ' +
               varname + ' "'+ label + '" right offset -1,-1');
         }
         varCount = i + 1;
      });
      if (opts.drawStdDevBackground !== false) {
         var lowvar = featureName + '_stddev_low';
         var highvar = featureName + '_stddev_high';
         if (grouped) {
            script.push("set obj rect from " + lowvar + ", graph 0 to " +
                        highvar + ", graph 1 lw 0 lc '#000000' fc '#cccccc'");
         } else {
            script.push("set obj rect from graph 0.0, first " + highvar +
                        " to graph 1, first " + lowvar +
                        " lw 0 lc '#000000' fc '#cccccc'");
         }
      }
      if (opts.drawPercentageLines) {
         var percentages = Object.keys(opts.drawPercentageLines);
         percentages.forEach(percentage => {
            if (!opts.drawPercentageLines[percentage]) return;
            var lineopts = {};
            if(typeof(opts.drawPercentageLines[percentage]) === 'object')
               lineopts = opts.drawPercentageLines[percentage];
            if (typeof(percentage) === 'string' && percentage.indexOf('%') > 0)
               percentage = parseFloat(percentage) / 100;
            var color = lineopts.color;
            if (!color) {
               if (percentage === 0.5) color = '#00aa00';
               else if (percentage > 0.5) color = '#00aaf0';
               else color = '#e48a41';
            }
            var label = Math.round(percentage * 100) + '%';
            var varname = featureName + '_' + Math.round(percentage * 100);
            script.push(
               varname + ' = ((' + featureName + '_max - ' +
               featureName + '_min) * ' + percentage +') + ' +
               featureName + '_min'
            );
            varCount++;
            if (grouped) {
               script.push("set arrow " + varCount + " from " + varname +
                  ", graph 0.0 to " + varname + ", graph 1.0 nohead fill lc '" +
                  color + "'");
               script.push("set label " + varCount + " at " + varname +
                  ", graph 1.0 \"" + label + "\" center offset 0,1 textcolor '" +
                  color + "'");
            } else {
               script.push("set arrow " + varCount + " from graph 0.0, first " +
                  varname + " to graph 1.0, first " + varname +
                  " nohead fill lc '" + color + "'");
               script.push("set label " + varCount + " at graph 1.0, first " +
                  varname + " \"" + label +
                  "\" right offset -1,-1 textcolor '" + color + "'");
            }
         });
      };
      console.noteln("Feature: " + feature);
      var plotTile = capitalizedString(featureName.replace(/_+/g, ' '), true);
      var plots = ['plot "' + dataFile + '" with lines smooth csplines ' +
         'title "' + plotTile + '"'];
      plots = plots.join(",\\\n");
      script.push(plots);
      script = script.join("\n");
      File.writeTextFile(scriptFile, script);
      var outputPath = this.getTempFile('stars_' + featureName + '.log');
      var err = null, code = null, status = null;
      var P = new ExternalProcess();
      with (P) {
         workingDirectory = File.systemTempDirectory;
         redirectStandardInput(scriptFile);
         redirectStandardOutput(outputPath);

         onStarted = function() {
            Console.writeln("Start " + gnuplotExe);
         }

         onError = function(errorCode) {
            err = errorCode;
            Console.criticalln("Error #" + errorCode);
         }

         onFinished = function(exitCode, exitStatus) {
            code = exitCode;
            status = exitStatus;
            Console.writeln("End Exit code = " + exitCode + ', ' +
                            "Status = " + exitStatus);
         }

         start(gnuplotExe);
         waitForFinished();
      }
      if (opts.log !== false) {
         var txt = File.readTextFile(outputPath);
         console.writeln(txt);
         console.flush();
      }
      var created = File.exists(imageFile);
      console.noteln("Plot image: " + imageFile);
      if (created && opts.drawToWindow) {
         try {
            var bm = new Bitmap(imageFile);
            var window = new ImageWindow(bm.width, bm.height, 3, 32, true, true,
               "Stars_" + featureName + "_Plot");
            window.mainView.beginProcess(UndoFlag_NoSwapFile);
            window.mainView.image.blend(bm);
            window.mainView.endProcess();
            window.show();
         } catch (e) {
            Console.warningln("Image load error: " + e);
         }
      }
      return {imageFile: imageFile, log: outputPath, script: scriptFile,
         created: created, errorCode: err, exitCode: code};
   },
   closeTemporaryWindows: function () {
      var lwin = this.luminanceView.window;
      if (lwin && lwin !== this.win && !lwin.isNull && !lwin.isClosed) {
            this.luminanceView.window.forceClose();
      }
      this.temporaryWindows.forEach(window => {
         if (!window.isClosed) window.forceClose;
      });
      this.temporaryWindows = [];
   },
   setStatus: function (status) {
      this.status = status;
      if (this.onStatusUpdate) this.onStatusUpdate(this, status);
   },
   updateProgress: function (progress, tot) {
      if (this.onProgressUpdate) this.onProgressUpdate(this, progress, tot);
   }
};
