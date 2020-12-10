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

#include "StarUtils.js"

#include <pjsr/Sizer.jsh>
#include <pjsr/FrameStyle.jsh>
#include <pjsr/TextAlign.jsh>
#include <pjsr/StdButton.jsh>
#include <pjsr/StdIcon.jsh>
#include <pjsr/UndoFlag.jsh>
#include <pjsr/ColorSpace.jsh>
#include <pjsr/NumericControl.jsh>
#include <pjsr/SampleType.jsh>
#include <pjsr/Slider.jsh>
#include <pjsr/DataType.jsh>
#include <pjsr/Color.jsh>
#include <pjsr/StdCursor.jsh>
#include <pjsr/ButtonCodes.jsh>
#include <pjsr/SectionBar.jsh>

var StarUtilsUI = {
   starDetector: [
      {
         label: 'Sensitivity',
         type: NumericControl,
         value: 0.1,
         range: [0, 1],
         tip: 'Sensitivity of the star detector device - smaller values mean ' +
              'more sensitivity.',
         name: 'sensitivity',
      },
      {
         label: 'Peak Response',
         name: 'peakResponse',
         type: NumericControl,
         value: 0.8,
         range: [0, 2],
         tip: 'Peak response of the star detector device - larger values are ' +
              'more tolerant with relatively flat structures.',
      },
      {
         label: 'Upper Peak Limit',
         name: 'upperPeakLimit',
         type: NumericControl,
         value: 1,
         range: [0, 10],
         tip: 'Stars with peak values greater than this value won\'t be detected..',
      },
      {
         label: 'Max Distortion',
         name: 'maxDistortion',
         type: NumericControl,
         value: 0.5,
         range: [0, 1],
         tip: 'Maximum distortion allowed, relative to a perfect square. ' +
              'The distortion of a perfect circle is pi/4.',
      },
      {
         label: 'XY Stretch',
         name: 'xyStretch',
         type: NumericControl,
         value: 1.5,
         range: [0, 5],
         tip: 'Stretch factor for the barycenter search algorithm, ' +
             "in sigma units.\n Increase it to make the algorithm " +
             "more robust to nearby structures,\n" +
             "such as multiple/crowded stars and small nebular features.\n" +
             'However, too large of a stretch factor will make the algorithm ' +
             'less accurate.'
      },
      {
         label: 'Structure Layers',
         name: 'structureLayers',
         type: SpinBox,
         value: 5,
         range: [1, 10],
         tip: 'Number of wavelet layers for structure detection.'
      },
   ],
   PSF: [
      {
         label: 'Star Width Threshold',
         //name: 'width',
         type: GroupBox,
         checkbox: true,
         children: [
            {
               label: 'Percentage',
               name: 'detectPSFThreshold.width',
               type: HorizontalSlider,
               value: 50,
               range: [0, 100],
               format: '%d%%',
               outputLabel: true,
               tip: 'Percentage of biggest stars to extract PSF from.',
            },
         ]
      },
      {
         label: 'Star Flux Threshold',
         //name: 'flux',
         type: GroupBox,
         checkbox: true,
         children: [
            {
               label: 'Percentage',
               name: 'detectPSFThreshold.flux',
               type: HorizontalSlider,
               value: 30,
               range: [0, 100],
               format: '%d%%',
               outputLabel: true,
               tip: 'Percentage of brightest stars to extract PSF from.',
            },
         ]
      },
   ],
   maskCreation: [
      {
         label: 'Type',
         propertyName: 'maskType',
         type: ComboBox,
         editEnabled: false,
         tip: 'Choose mask type.',
         items: [
            'Selected stars',
            'Undetected stars',
            'Custom',
         ]
      },
      {
         label: 'Width',
         propertyName: 'maskStarWidthThreshold',
         type: HorizontalSlider,
         value: 70,
         range: [0, 100],
         format: '%d%%',
         outputLabel: true,
         tip: 'Threshold of biggest stars to be used for mask creation.',
      },
      {
         label: 'Flux',
         propertyName: 'maskStarWidthThreshold',
         type: HorizontalSlider,
         value: 50,
         range: [0, 100],
         format: '%d%%',
         outputLabel: true,
         tip: 'Threshold of brightest stars to be used for mask creation.',
      },
      /*{
         label: 'Create Mask',
         type: PushButton,
         propertyName: 'createMaskButton',
         tip: 'Create mask.',
         align: Align_Center
      },*/
   ],
   fixElongatedStars: [
      {
         label: 'Threshold',
         propertyName: 'fixElongatedStarsThreshold',
         type: NumericControl,
         value: 0.9,
         range: [0, 1],
         tip: "Threshold for the star\'s aspect ratio. Only stars having an \n"+
              "aspect ratio lower than the threshold will be fixed.\n" +
              "(A perfect rounded star has an aspect ratio of 1)"
      },
      {
         label: 'Keep Masks',
         propertyName: 'fixElongatedStarsKeepMasks',
         type: CheckBox,
         checked: true,
         tip: "Keep masks used to fix stars",
      },
   ],
   reduceStars: [
      {
         label: 'Morphological Selection',
         propertyName: 'reduceStarsSelection',
         type: NumericControl,
         value: 0.25,
         range: [0.1, 0.45],
         tip: "Morphological selection. Lower values mean more reduction",
      },
   ]
};

function ProgressBar(parent, opts) {

   this.__base__ = Label;
   this.__base__(parent);
   var me = this;
   opts = opts || {};

   this.backgroundColor = opts.backgroundColor || 0xFFF0F0F0;
   this.scaledMinHeight = 12;
   this.textAlignment = TextAlign_HorzCenter | TextAlign_VertCenter;

   this.progress = 0;
   this.total = 100;

   this.trackColor = opts.trackColor || 0xFFFFFFFF;
   this.progressColor = opts.progressColor || 0xFF00FF00;
   this.getProgressText = opts.getProgressText || function (_cur,_tot,_perc) {
      return format('%d/%d (%d%%)', _cur,_tot,_perc);
   };

   this.onPaint = function() {
      var i = this.progress || 0;
      var tot = this.total || 1;
      var progressPercent = i / tot;
      var text = '';
      if (this.displayText !== false && this.total) {
         var percentTxt = Math.round(progressPercent * 100);
         text = me.getProgressText(i, this.total, percentTxt);
      }
      this.text = text;
      var g = new Graphics();
      g.begin(this);
      g.clipRect = new Rect(0, 0, this.width, this.height);
      if (progressPercent == 0 || !this.total) {
         var clear = new Brush(parent.backgroundColor);
         g.clipRect = new Rect(0, 0, this.width, this.height);
         g.fillRect(g.clipRect, clear);
      } else {
         var clear = new Brush(this.trackColor);
         var r = new Rect(0, 0, parent.width - this.position.x * 2,
            this.height);
         g.clipRect = r;
         g.fillRect(g.clipRect, clear);
         var w = progressPercent * r.width;
         r = new Rect(0, 0, w, this.height);
         g.fillRect(r, new Brush(this.progressColor));
      }
      g.end();
   }

   this.updateProgress = function (progress, tot) {
      if (progress > tot) progress = tot;
      this.progress = progress;
      this.total = tot;
      this.repaint();
   }

}

ProgressBar.prototype = new Label;

function PreviewControl(parent, opts) {
   this.__base__ = Frame;
   this.__base__(parent);
   var me = this;

   this.opts = opts;

   this.style = opts.style || FrameStyle_Flat;
   this.lineWidth = opts.lineWidth || 0;

   var w = opts.minWidth || 320,
       h = opts.minHeight || 240;
   this.setScaledMinSize(w, h);
   this.zoom = 1;
   this.scale = 1;
   this.zoomOutLimit = -5;

   /* UI */
   this.scrollbox = new ScrollBox(this);
   this.scrollbox.autoScroll = true;
   this.scrollbox.tracking = true;
   this.scrollbox.cursor = new Cursor(StdCursor_Arrow);

   this.scroll_Sizer = new HorizontalSizer;
   this.scroll_Sizer.add(this.scrollbox);

   this.zoomIn_Button = new ToolButton(this);
   this.zoomIn_Button.icon = this.scaledResource( ":/icons/zoom-in.png" );
   this.zoomIn_Button.setScaledFixedSize(20,20);
   this.zoomIn_Button.toolTip = "Zoom in";
   this.zoomIn_Button.onMousePress = function() {
      this.parent.updateZoom(this.parent.zoom+1);
   };

   this.zoomOut_Button = new ToolButton(this);
   this.zoomOut_Button.icon = this.scaledResource( ":/icons/zoom-out.png" );
   this.zoomOut_Button.setScaledFixedSize(20, 20);
   this.zoomOut_Button.toolTip = "Zoom in";
   this.zoomOut_Button.onMousePress = function() {
      this.parent.updateZoom(this.parent.zoom-1);
   };

   this.zoom11_Button = new ToolButton(this);
   this.zoom11_Button.icon = this.scaledResource( ":/icons/zoom-1-1.png" );
   this.zoom11_Button.setScaledFixedSize(20, 20);
   this.zoom11_Button.toolTip = "Zoom 1:1";
   this.zoom11_Button.onMousePress = function() {
      this.parent.updateZoom(1);
   };

   var extraButtons = this.opts.extraButtons, buttonsToAdd = [];
   if (extraButtons) {
      extraButtons.forEach(btnDef => {
         var btnType = btnDef.type || ToolButton;
         var btn = new btnType(me);
         if (btnDef.name) me[btnDef.name] = btn;
         var icon = btnDef.icon;
         if (icon) btn.icon = icon;
         btn.setScaledFixedSize(20, 20);
         if (btnDef.tooltip) btn.toolTip = btnDef.tooltip;
         var onClick = btnDef.onClick, onCheck = btnDef.onCheck;
         if (onClick) btn.onClick = onClick;
         if (onCheck) btn.onCheck = onCheck;
         if (btnDef.checkable) {
            btn.checkable = true;
            btn.checked = btnDef.checked === true;
         }
         btn.enabled = btnDef.enabled !== false;
         buttonsToAdd.push(btn);
      });
   }

   this.buttons_Sizer = new HorizontalSizer;
   this.buttons_Sizer.add(this.zoomIn_Button);
   this.buttons_Sizer.add(this.zoomOut_Button);
   this.buttons_Sizer.add(this.zoom11_Button);
   buttonsToAdd.forEach(btn => {me.buttons_Sizer.add(btn)});
   this.buttons_Sizer.addStretch();

      this.zoomLabel_Label = new Label(this);
   this.zoomLabel_Label.text = "Zoom:";
   this.zoomLabel_Label.textColor = 0xffffffff;
   this.zoomVal_Label = new Label(this);
   this.zoomVal_Label.text = "1:1";
   this.zoomVal_Label.textColor = 0xffffffff;

   this.Xlabel_Label = new Label(this);
   this.Xlabel_Label.text = "X:";
   this.Xlabel_Label.textColor = 0xffffffff;
   this.Xval_Label = new Label(this);
   this.Xval_Label.text = "---";
   this.Xval_Label.textColor = 0xffffffff;
   this.Ylabel_Label = new Label(this);
   this.Ylabel_Label.text = "Y:";
   this.Ylabel_Label.textColor = 0xffffffff;
   this.Yval_Label = new Label(this);
   this.Yval_Label.text = "---";
   this.Yval_Label.textColor = 0xffffffff;

   this.coords_Frame = new Frame(this);
   this.coords_Frame.lineWidth = 0;
   this.coords_Frame.style = FrameStyle_Flat;
   this.coords_Frame.backgroundColor = 0xff666666;
   this.coords_Frame.textColor = 0xffffffff;
   this.coords_Frame.sizer = new HorizontalSizer;
   this.coords_Frame.sizer.margin = 2;
   this.coords_Frame.sizer.spacing = 4;
   this.coords_Frame.sizer.add(this.zoomLabel_Label);
   this.coords_Frame.sizer.add(this.zoomVal_Label);
   this.coords_Frame.sizer.addSpacing(6);
   this.coords_Frame.sizer.add(this.Xlabel_Label);
   this.coords_Frame.sizer.add(this.Xval_Label);
   this.coords_Frame.sizer.addSpacing(6);
   this.coords_Frame.sizer.add(this.Ylabel_Label);
   this.coords_Frame.sizer.add(this.Yval_Label);

   this.coords_Frame.sizer.addStretch();

   this.sizer = new VerticalSizer;
   this.sizer.add(this.buttons_Sizer);
   this.sizer.add(this.scroll_Sizer);
   this.sizer.add(this.coords_Frame);

   /* Methods */

   this.setImage = function(image, metadata) {
      this.image = image;
      this.metadata = metadata;
      this.scaledImage = null;
      if (metadata && metadata.originalImage)
         this.srcImage = new Image(this.metadata.originalImage);
      this.setZoomOutLimit();
      this.updateZoom(metadata.zoom || -100);
   }

   this.createImageWindow = function (windowId) {
      if (!this.srcImage) return null;
      var img = this.srcImage;
      var window = new ImageWindow(img.width, img.height,
         img.numberOfChannels,img.bitsPerSample,
         img.isReal,img.isColor,
         windowId || 'tmpImage_' + (new Date().getTime()));
      if (!window || window.isNull) return null;
      window.mainView.beginProcess(UndoFlag_NoSwapFile);
      window.mainView.image.assign(img);
      window.mainView.endProcess();
      return window;
   }

   this.updateZoom = function (newZoom, refPoint) {
      newZoom = Math.max(this.zoomOutLimit, Math.min(2, newZoom));
      if (newZoom == this.zoom && this.scaledImage) return;
      if (!refPoint) {
         /* Use central point as reference point */
         refPoint = new Point(this.scrollbox.viewport.width/2,
            this.scrollbox.viewport.height/2);
      }
      var imgx = null, imgy = null;
      if (this.scrollbox.maxHorizontalScrollPosition > 0)
         imgx = (refPoint.x+this.scrollbox.horizontalScrollPosition)/this.scale;
      if (this.scrollbox.maxVerticalScrollPosition > 0)
         imgy = (refPoint.y+this.scrollbox.verticalScrollPosition)/this.scale;

      /* Scale the image */
      this.zoom = newZoom;
      this.scaledImage = null;
      gc(true);
      if (this.zoom > 0) {
         this.scale = this.zoom;
         this.zoomVal_Label.text = format("%d:1", this.zoom);
      } else {
         this.scale = 1 / (-this.zoom + 2);
         this.zoomVal_Label.text = format("1:%d", -this.zoom + 2);
      }
      if (this.image)
         this.scaledImage = this.image.scaled(this.scale);
      else {
         this.scaledImage = {
            width: this.metadata.width * this.scale,
            height:this.metadata.height * this.scale
         };
      }

      /* Update scroll */
      this.scrollbox.maxHorizontalScrollPosition =
         Math.max(0, this.scaledImage.width - this.scrollbox.viewport.width);
      this.scrollbox.maxVerticalScrollPosition =
         Math.max(0, this.scaledImage.height - this.scrollbox.viewport.height);

      if(this.scrollbox.maxHorizontalScrollPosition > 0 && imgx!=null)
         this.scrollbox.horizontalScrollPosition = (imgx*this.scale)-refPoint.x;
      if(this.scrollbox.maxVerticalScrollPosition > 0 && imgy != null)
         this.scrollbox.verticalScrollPosition = (imgy*this.scale)-refPoint.y;
      this.scrollbox.viewport.update();
   }

   this.scrollTo = function (x, y) {
      x *= this.zoom;
      y *= this.zoom;
      x -= (this.scrollbox.viewport.width) / 2;
      y -= (this.scrollbox.viewport.height) / 2;
      this.scrollbox.setScrollPosition(x, y);
   }

   this.setZoomOutLimit = function() {
      var scaleX = Math.ceil(this.metadata.width/this.scrollbox.viewport.width);
      var scaleY = Math.ceil(this.metadata.height/this.scrollbox.viewport.height);
      var scale = Math.max(scaleX,scaleY);
      this.zoomOutLimit = -scale+2;
   }

   this.transform = function(x, y, preview) {
      if (!preview.scaledImage) return null;
      var scrollbox = preview.scrollbox;
      var ox = 0;
      var oy = 0;
      ox = scrollbox.maxHorizontalScrollPosition>0 ? -scrollbox.horizontalScrollPosition : (scrollbox.viewport.width-preview.scaledImage.width)/2;
      oy = scrollbox.maxVerticalScrollPosition>0 ? -scrollbox.verticalScrollPosition: (scrollbox.viewport.height-preview.scaledImage.height)/2;
      var coordPx = new Point((x - ox) / preview.scale, (y - oy) / preview.scale);
      return new Point(coordPx.x, coordPx.y);
   }

   this.center = function() {
      var preview = this;
      var scrollbox = preview.scrollbox;
      var x = scrollbox.viewport.width / 2;
      var y = scrollbox.viewport.height / 2;
      var p =  this.transform(x, y, preview);
      return p;
   }

   /* Scrollbox event handlers */

   this.scrollbox.onHorizontalScrollPosUpdated = function (newPos) {
      this.viewport.update();
   }
   this.scrollbox.onVerticalScrollPosUpdated = function (newPos) {
      this.viewport.update();
   }

   this.forceRedraw = function() {
      this.scrollbox.viewport.update();
   };

   /* Event Handlers */

   this.scrollbox.viewport.onMouseWheel = function (x, y, delta, buttonState,
      modifiers)
   {
      var preview = this.parent.parent;
      preview.updateZoom(preview.zoom + (delta > 0 ? -1 : 1), new Point(x,y));
   }

   this.scrollbox.viewport.onMousePress = function (x, y, button, buttonState,
      modifiers)
   {
      var preview = this.parent.parent;
      var p =  preview.transform(x, y, preview);
      if (!p || isNaN(p.x) || isNaN(p.y)) return;
      this.mousePressedAt = p;
      if (preview.onCustomMouseDown) {
         preview.onCustomMouseDown.call(this, p.x, p.y, button, buttonState,
            modifiers )
      }
   }

   this.scrollbox.viewport.onMouseMove = function ( x, y, buttonState,
      modifiers)
   {
      var preview = this.parent.parent;
      var p =  preview.transform(x, y, preview);
      if (!p || isNaN(p.x) || isNaN(p.y)) return;
      preview.Xval_Label.text = p.x.toString();
      preview.Yval_Label.text = p.y.toString();

      if(preview.onCustomMouseMove) {
         preview.onCustomMouseMove.call(this, p.x, p.y, buttonState, modifiers);
      }
   }

   this.scrollbox.viewport.onMouseRelease = function (x, y, button, buttonState,
      modifiers)
   {
      var preview = this.parent.parent;
      var pressedAt = this.mousePressedAt;
      this.mousePressedAt = null;
      var p =  preview.transform(x, y, preview);
      if (!p || isNaN(p.x) || isNaN(p.y)) return;
      if (preview.onCustomMouseUp) {
         preview.onCustomMouseUp.call(this, p.x, p.y, button, buttonState,
            modifiers);
      }
      if (pressedAt) {
         var dX = Math.abs(p.x - pressedAt.x);
         var dY = Math.abs(p.y - pressedAt.y);
         var d = Math.max(dX, dY);
         if (d < 2 && preview.onCustomMouseClick) {
            preview.onCustomMouseClick.call(this, p.x, p.y, buttonState,
               modifiers);
         }
      }
   }

   this.scrollbox.viewport.onResize = function (wNew, hNew, wOld, hOld) {
      var preview = this.parent.parent;
      if (preview.metadata && preview.scaledImage) {
         this.parent.maxHorizontalScrollPosition =
            Math.max(0, preview.scaledImage.width - wNew);
         this.parent.maxVerticalScrollPosition =
            Math.max(0, preview.scaledImage.height - hNew);
         preview.setZoomOutLimit();
         preview.updateZoom(preview.zoom);
      }
      this.update();
   }

   /* Rendering */

   this.scrollbox.viewport.onPaint = function (x0, y0, x1, y1) {
      var preview = this.parent.parent;
      if (!preview.scaledImage) return;
      var graphics = new VectorGraphics(this);

      graphics.fillRect(x0,y0, x1, y1, new Brush(0xff202020));
      var offsetX = this.parent.maxHorizontalScrollPosition>0 ? -this.parent.horizontalScrollPosition : (this.width-preview.scaledImage.width)/2;
      var offsetY = this.parent.maxVerticalScrollPosition>0 ? -this.parent.verticalScrollPosition: (this.height-preview.scaledImage.height)/2;
      graphics.translateTransformation(offsetX, offsetY);
      if (preview.image)
         graphics.drawBitmap(0, 0, preview.scaledImage);
      else {
         graphics.fillRect(0, 0, preview.scaledImage.width,
            preview.scaledImage.height, new Brush(0xff000000));
      }
      graphics.pen = new Pen(0xffffffff,0);
      graphics.drawRect(-1, -1, preview.scaledImage.width + 1,
         preview.scaledImage.height + 1);

      if (preview.onCustomPaint) {
         graphics.antialiasing = true;
         graphics.scaleTransformation(preview.scale,preview.scale);
         preview.onCustomPaint.call(this, graphics, x0, y0, x1, y1);
      }
      graphics.end();
   }

}

PreviewControl.prototype = new Frame;

function StatsDialog(parent) {
   this.__base__ = Dialog;
   this.__base__(parent);
   var me = this;

   this.getFieldMaxWidth = function (stats) {
      if (this.fieldMaxWidth !== undefined) return this.fieldMaxWidth;
      var maxW = 0;
      Object.keys(stats).forEach(field => {
         var w = me.font.width(field + ': ');
         if (w > maxW) maxW = w;
      });
      if (maxW === 0) maxW = me.font.width('MMMMMMMMMMM');
      else this.fieldMaxWidth = maxW;
      return maxW;
   };

   this.drawCharts = function () {
      if (!this.starUtils) return;
      var ungroupedChart = this.starUtils.ungroupedChart;
      var groupedChart = this.starUtils.groupedChart;
      if (!ungroupedChart) {
         var res = this.starUtils.drawPlot('width', {
            drawToWindow: false,
            grouped: false,
            drawPercentageLines: {'25%': true, '50%': true, '75%': true}
         });
         if (!res.created) {
            parent.alert("Failed to create charts!");
            return;
         }
         var imageFile = res.imageFile;
         ungroupedChart = new Bitmap(imageFile);
         this.starUtils.ungroupedChart = ungroupedChart;
      }

      this.ungroupedChartImage.setImage(ungroupedChart, {
         width: ungroupedChart.width,
         height: ungroupedChart.height
      });

      if (!groupedChart) {
         res = this.starUtils.drawPlot('width', {
            drawToWindow: false,
            grouped: true,
            drawPercentageLines: {'25%': true, '50%': true, '75%': true}
         });
         if (!res.created) {
            parent.alert("Failed to create charts!");
            return;
         }
         imageFile = res.imageFile;
         groupedChart = new Bitmap(imageFile);
         this.starUtils.groupedChart = groupedChart;
      }

      this.groupedChartImage.setImage(groupedChart, {
         width: groupedChart.width,
         height: groupedChart.height
      });
   }

   this.updateStats = function () {
      if (!this.starUtils) return;
      var stats = this.starUtils.stats;
      //console.noteln(JSON.stringify(stats, null, 4));
      var sizer = this.statsBox.viewport.sizer;
      ['width', 'flux'].forEach(function (quantity) {
         var name = quantity.charAt(0).toUpperCase() + quantity.substr(1);
         var dtlStats = stats[quantity];
         var hdrsizer = new HorizontalSizer;//parent.createHorizontalSizer(me);
         var header = new Label(me);
         header.useRichText = true;
         header.text = "<b>Star " + name + '</b>';
         hdrsizer.add(header, 0, Align_Left);
         sizer.add(hdrsizer);
         Object.keys(dtlStats).forEach(field => {
            var rowsizer = new HorizontalSizer;
            var fieldLbl = new Label(me);
            fieldLbl.text = field + ': ';
            fieldLbl.setFixedWidth(me.getFieldMaxWidth(dtlStats));
            fieldLbl.textAlignment = TextAlign_VertCenter | TextAlign_Right;
            var valueLbl = new Label(me);
            valueLbl.text = format('%.2f', dtlStats[field] || 0);
            valueLbl.textAlignment = TextAlign_VertCenter;
            rowsizer.add(fieldLbl);
            rowsizer.add(valueLbl);
            sizer.add(rowsizer);
         });
      });
      this.statsBox.viewport.update();
   };

   this.starUtils = parent.starUtils;
   this.sizer = parent.createHorizontalSizer(this);
   this.leftSizer = parent.createVerticalSizer(this);
   this.rightSizer = parent.createVerticalSizer(this);

   var previewOpts = {minWidth: 320, minHeight: 266};
   this.ungroupedChartImage = new PreviewControl(this, previewOpts);
   this.ungroupedChartImage.setImage(null, {});
   this.groupedChartImage = new PreviewControl(this, previewOpts);
   this.groupedChartImage.setImage(null, {});
   this.leftSizer.add(this.ungroupedChartImage);
   this.leftSizer.add(this.groupedChartImage);

   this.statsBox = new ScrollBox(this);
   var par = parent;
   with (this.statsBox) {
      autoScroll = true;
      sizer = par.createVerticalSizer(me);
      viewport.sizer = par.createVerticalSizer(me);
   }
   this.rightSizer.add(this.statsBox);

   this.sizer.add(this.leftSizer);
   this.sizer.add(this.rightSizer);

   this.onExecute = function () {
      me.updateStats();
      me.drawCharts();
   };

   this.windowTitle = "StarUtils Statistics";
   this.adjustToContents();
}

StatsDialog.prototype = new Dialog;

function StarUtilsDialog (options) {

   this.__base__ = Dialog;
   this.__base__();
   this.options = options || {};

   this.starUtils = null;
   this.optControls = {};
   this.status = null;
   var me = this;

   this.onClose = function (retval) {
      me.deleteStarUtils();
   };

   this.onShow = function () {
      me.updateUI();
   }

   this.getOptions = function () {
      var opts = {};
      var optNames = Object.keys(this.optControls);
      optNames.forEach(name => {
         var control = me.optControls[name];
         var element = control.element;
         var value = element.value;
         if (value === undefined) return;
         if (control.format) value = format(control.format, value);
         var optContainer = opts, propName = name;
         if (name.indexOf('.') > 0) {
            var components = name.split('.');
            var containerName = components[0], propName = components[1];
            optContainer = opts[containerName];
            if (!optContainer) optContainer = opts[containerName] = {};
         }
         optContainer[propName] = value;
      });
      return opts;
   };

   this.deleteStarUtils = function () {
      if (this.starUtils) {
         this.starUtils.closeTemporaryWindows();
         this.bitmaps = null;
      }
      this.starUtils = null;
      this.starsDetected = false;
      gc(true);
   }

   this.newStarUtils = function () {
      var view = this.viewList.currentView;
      if (!view || view.isNull) {
         me.alert("No view selected!");
         return null;
      }
      this.deleteStarUtils();
      var opts = this.getOptions();
      //console.writeln(JSON.stringify(opts,null,4));
      opts.window = view.window;
      opts.onStatusUpdate = function (sd, status) {
         me.onStatusUpdate(status);
      }
      opts.onProgressUpdate = function (sd, prog, tot) {
         me.onProgressUpdate(prog, tot);
      };
      this.starUtils = new StarUtils(opts);
      this.starsDetected = false;
      return this.starUtils;
   };

   this.onStatusUpdate = function (status) {
      console.writeln("Status: " + status);
      if (status) status = '<b>' + status + '</b>';
      this.statusLabel.text = status || '---';
   }

   this.onProgressUpdate = function (progress, tot) {
      if (!tot || tot === 0) {
         this.progressLabel.text = '';
         return;
      }
      this.progressLabel.text = progress + '/' + tot;
      this.progressBar.updateProgress(progress, tot);
   };

   this.populateStarList = function (stars) {
      this.starListBox.clear();
      if (!stars && this.starUtils) stars = this.starUtils.stars;
      if (!stars) return;
      var listBox = this.starListBox;
      stars.forEach(star => {
         var node = new TreeBoxNode();
         node.setText(0, star.id);
         node.setText(1, format('%.2f', star.width));
         node.setText(2, format('%.2f', star.flux));
         if (star.psf)
            node.setText(3, format('%.2f', star.psf.aspectRatio));
         else
            node.setText(3,'---');
         node.star = star;
         star.node = node;
         listBox.add(node);
      });
   };

   this.getSelectedStars = function () {
      return this.starListBox.selectedNodes.map(node => node.star);
   };

   this.getBitmapID = function (stars) {
      stars = stars || [];
      return stars.map(s => s.id).sort().join();
   }

   this.previewSetImageWithNoMarks = function (opts) {
      opts = opts || {};
      this.setPreviewImage([], {
         bitmapID: 'noMarks',
         zoom: opts.zoom
      });
   };

   this.previewDisplayDetectedStars = function (opts) {
      opts = opts || {};
      if (!this.starUtils || !this.starsDetected) return;
      this.setPreviewImage(this.starUtils.stars, {
         color: 0xaa0099bb,
         bitmapID: 'detectedStars',
         zoom: opts.zoom
      });
   };

   this.setPreviewImage = function (stars, opts) {
      if (!this.starUtils) return;
      opts = opts || {};
      stars = stars || [];
      var bmpID = opts.bitmapID || this.getBitmapID(stars);
      if (bmpID === this.previewBitmapID) return;
      this.settingPreviewBitmapWithID = bmpID;
      this.bitmaps = this.bitmaps || {}; /* Bitmaps cache */
      var imageBmp = this.bitmaps[bmpID];
      if (!imageBmp) {
         imageBmp = this.starUtils.createAnnotatedWindow(stars, {
            color: opts.color,
            returnBitmap: true
         });
         this.bitmaps[bmpID] = imageBmp;
      }
      var zoom = opts.zoom, scroll = opts.scroll;
      if (this.zoomPreviewToStar && this.zoomPreviewToStar.id === bmpID) {
         zoom = zoom || this.zoomPreviewToStar.zoom;
         scroll = this.zoomPreviewToStar.scroll;
      }
      this.dialog.previewControl.setImage(imageBmp, {
         width: imageBmp.width,
         height: imageBmp.height,
         zoom: zoom
      });
      if (scroll && !isNaN(scroll.x) && !isNaN(scroll.y))
         this.previewControl.scrollTo(scroll.x, scroll.y);
      this.settingPreviewBitmapWithID = null;
      this.previewBitmapID = bmpID;
      this.zoomPreviewToStar = null;
      var toggleBtn = this.previewControl.toggleDetectedStarsBtn;
      if (toggleBtn && bmpID !== 'detectedStars' && toggleBtn.checked)
         toggleBtn.checked = false;
   }

   this.previewZoomToStars = function (stars) {
      if (stars.length === 0) return;
      if (!this.previewControl.image) return;
      var minTop = null, minLeft = null, maxRight = null, maxBottom = null;
      stars.forEach(star => {
         var rect = star.rect;
         if (minTop === null || rect.top < minTop) minTop = rect.top;
         if (minLeft === null || rect.left < minLeft) minLeft = rect.left;
         if (maxRight === null || rect.right > maxRight) maxRight = rect.right;
         if (maxBottom === null || rect.bottom > maxBottom)
            maxBottom = rect.bottom;
      });
      var rect = new Rect(minLeft, minTop, maxRight, maxBottom);
      var r = me.previewControl.image.width / rect.width;
      var center = rect.center;
      console.writeln(format("Centering preview on stars at: %.1f, %.1f",
         center.x, center.y));
      if (stars.length === 1) {
         var star = stars[0];
         if (star.id === this.settingPreviewBitmapWithID) {
            this.zoomPreviewToStar = {id: star.id, zoom: r, scroll: {
                  x: center.x,
                  y: center.y,
               }
            };
            return;
         }
      }
      me.previewControl.updateZoom(r);
      me.previewControl.scrollTo(center.x, center.y);
   };

   this.previewMarkSelectedStars = function () {
      var stars = me.getSelectedStars();
      if (stars.length === 0) {
         me.alert('No star selected');
      }
      me.setPreviewImage(stars);
      me.previewZoomToStars(stars);
   };

   this.updateUI = function () {
      var collapsablePanels = this.options.collapsablePanels !== false;
      if (!this.starUtils || !this.starsDetected) {
         this.analyzeButton.enabled = true;
         this.createMaskButton.enabled = false;
         this.statsButton.enabled = false;
         this.fixButton.enabled = false;
         this.statusLabel.text = '---';
         this.progressLabel.text = '';
         this.foundStarsLabel.text = '---';

         this.starListBox.clear();
         this.previewControl.setImage(null, {});
         this.progressBar.updateProgress(0, 0);
         if (collapsablePanels) {
            this.leftPanel.show();
            this.centerPanel.hide();
            this.rightPanel.hide();
         }
      } else {
         this.analyzeButton.enabled = false;
         this.statsButton.enabled = true;
         this.createMaskButton.enabled = true;
         var fixElongated = fixElongationBox.checked;
         var reduce = reduceStarsBox.checked;
         this.fixButton.enabled = (fixElongated || reduce);
         if (collapsablePanels) {
            this.leftPanel.hide();
            this.centerPanel.show();
            this.rightPanel.show();
         }
      }
      this.adjustToContents();
   };

   this.reset = function () {
      this.enabled = false;
      this.deleteStarUtils();
      var optNames = Object.keys(this.optControls);
      optNames.forEach(name => {
         var control = me.optControls[name];
         var element = control.element;
         var defVal = control.defaultValue;
         if (defVal) {
            if (element.setValue) element.setValue(defVal);
            else element.value = defVal;
            if (element.onValueUpdated) element.onValueUpdated(defVal);
         }
      });
      //this.resetButton.enabled = false;
      this.enabled = true;
      this.updateUI();
      with (this.previewControl.toggleDetectedStarsBtn) {
         checked = false;
         enabled = false;
      }
      this.previewControl.clearSelectedStarsBtn.enabled = false;
   };

   this.startAnalysis = function () {
      var sd = this.newStarUtils();
      if (!sd) return;
      this.analyzeButton.enabled = false;
      this.enabled = false;
      try {
         sd.analyzeStars();
         this.foundStarsLabel.text = '' + sd.stars.length;
         sd.setLimits();
         sd.classifyStars();
         this.onStatusUpdate('Done');
         this.onProgressUpdate(0,0);
         this.resetButton.enabled = true;
         this.populateStarList(sd.stars);
         this.starsDetected = (sd.stars.length > 0);
         this.updateUI();
         this.previewDisplayDetectedStars();
         with (this.previewControl.toggleDetectedStarsBtn) {
            checked = true;
            enabled = true;
         }
         this.previewControl.clearSelectedStarsBtn.enabled = true;
      } catch (e) {
         me.deleteStarUtils();
         this.analyzeButton.enabled = true;
         me.alert("Execution error");
         me.cancel();
         throw e;
      } finally {

      }
      this.enabled = true;
   };

   this.alert = function (message) {
      var msgbox = new MessageBox(message, "StarUtils", StdIcon_Error,
         StdButton_Ok);
      msgbox.execute();
   };

   this.createSizer = function (type, parent) {
      var sizer = null;
      if (typeof(type) === 'string') {
         var c = type.charAt(0).toLowerString();
         if (c === 'h')
            type = HorizontalSizer;
         else if (c === 'v')
            type = VerticalSizer;
      }
      if (type === HorizontalSizer || type === VerticalSizer) {
         if (parent) sizer = new type(parent);
         else sizer = new type();
         sizer.margin = 4;
         sizer.spacing = 4;
         //sizer.setAlignment(parent || this, Align_Left | Align_Top);
      } else throw("Invalid sizer type: " + type);
      return sizer;
   }

   this.createHorizontalSizer = function (parent) {
      return this.createSizer(HorizontalSizer, parent);
   }

   this.createVerticalSizer = function (parent) {
      return this.createSizer(VerticalSizer, parent);
   }

   this.calculateLabelFixedWidth = function (label, sectionName) {
      var section = StarUtilsUI[sectionName];
      var txtWidth = 0;
      if (section) {
         if (!this.sectionMaxLabelWidths) this.sectionMaxLabelWidths = {};
         var width = this.sectionMaxLabelWidths[sectionName];
         if (width !== undefined) return width;
         var maxWidth = 0;
         var getMaxWidth = function (control) {
            var w = 0;
            var t = control.type;
            if (control.label && t !== GroupBox && t !== CheckBox) {
               w = me.font.width(control.label + ':');
            }
            if (w > maxWidth) maxWidth = w;
            if (control.children) {
               control.children.forEach(child => {
                  getMaxWidth(child);
               });
            }
         };
         section.forEach(getMaxWidth);
         if (maxWidth > 0) txtWidth = maxWidth;
      }
      if (txtWidth === 0 && label && label.text)
         txtWidth = this.font.width(label.text);
      if (txtWidth === 0) return 0;
      if (section) this.sectionMaxLabelWidths[sectionName] = txtWidth;
      return txtWidth;
   };

   this.createControl = function (control, sizer, opts) {
      opts = opts || {};
      var type = control.type;
      if (!type) return null;
      var name = control.name;
      var label = control.label;
      var element = new type(me);
      //element.setFixedWidth(editW);
      if (control.tip) element.toolTip = control.tip;
      var value = control.value;
      var align = control.align;
      if (align === undefined) align = Align_Left;
      var elementSizer = null;
      var isGroupBox = (type === GroupBox);
      var isButton = (type === PushButton);
      var isCheckbox = (type === CheckBox);
      if (!isGroupBox && !isButton && label) {
         var txt = label;
         label = new Label(element);
         label.text = txt + ':';
         var lblAlign = (isCheckbox ? TextAlign_Left : TextAlign_Right);
         label.textAlignment = lblAlign | TextAlign_VertCenter;
         var labelWidth = opts.labelWidth || control.labelWidth;
         if (!labelWidth && opts.section)
            labelWidth = this.calculateLabelFixedWidth(label, opts.section);
         labelWidth = labelWidth || labelW;
         label.setFixedWidth(labelWidth);
      }
      if (type === NumericControl || type === NumericEdit ||
          type === SpinBox || type === HorizontalSlider)
      {
         if (label) element.label = label;
         var range = control.range;
         if (range) element.setRange(range[0], range[1]);
         if (value !== undefined) {
            element.value = value;
            if (element.setValue) element.setValue(value);
         }
         //var extraSizer = null;
         //element.setFixedWidth(numericEditW);
         elementSizer = me.createHorizontalSizer(sizer);
         if (label) elementSizer.add(label, 0, align);
         if (type === SpinBox || type === HorizontalSlider)
            elementSizer.addUnscaledSpacing(oneCharW);
         elementSizer.add(element, 1, align);
         if (type === SpinBox) {
            //element.setFixedWidth(numericEditW);
            //elementSizer.addUnscaledSpacing(numericEditW);
         } else if (type === HorizontalSlider) {
            element.setFixedWidth(numericEditW);
         }
         if (control.outputLabel) {
            var updateText = function (val) {
               if (control.format)
                  outputLabel.text = format(control.format, val);
               else outputLabel.text = '' + val;
            };
            elementSizer.addUnscaledSpacing(oneCharW);
            var outputLabel = new Label(element);
            value = value || 0;
            updateText(value);
            var outputWidth = 0, maxVal = 0;
            if (range) maxVal = range[1];
            if (maxVal) {
               var outstr = '';
               if (control.format) outstr = format(control.format, maxVal);
               else outstr = maxVal + '';
               outputWidth = me.font.width(outstr);
               if (outputWidth) outputWidth++; /* Make room for one char */
            }
            outputWidth = outputWidth || numericEditW;
            outputLabel.textAlignment = TextAlign_Left|TextAlign_VertCenter;
            outputLabel.setFixedWidth(outputWidth);
            element.onValueUpdated = updateText;
            elementSizer.add(outputLabel, 1, align);
         }
         //if (extraSizer) elementSizer.add(extraSizer);
      } else if (isGroupBox) {
         if (label) element.title = label;
         if (control.checkbox) element.titleCheckBox = true;
         var children = control.children;
         if (children) {
            var sizerClass = control.sizerType || HorizontalSizer;
            var csizer = element.sizer = me.createSizer(sizerClass, element);
            children.forEach(child => {
               var childElem = me.createControl(child, csizer, opts);
            });
         }
      } else if (type === ComboBox) {
         elementSizer = me.createHorizontalSizer(sizer);
         if (label) {
            elementSizer.add(label, 0, Align_Left);
            elementSizer.addUnscaledSpacing(oneCharW);
         }
         element.editEnabled = (control.editEnabled === true);
         element.setFixedWidth(numericEditW);
         var items = control.items || [];
         items.forEach(item => {element.addItem(item)});
         elementSizer.add(element, 1, Align_Left);
         //elementSizer.addStretch(numericEditW);
      } else if (isCheckbox) {
         element.setFixedWidth(me.font.width('MMM'));
         elementSizer = me.createHorizontalSizer(sizer);
         elementSizer.add(element, 0, align);
         if (label) {
            //elementSizer.addUnscaledSpacing(oneCharW);
            elementSizer.add(label, 1, Align_Left);
         }
         element.checked = control.checked === true;
      } else if (isButton) {
         if (label) element.text = label;
         elementSizer = me.createHorizontalSizer(sizer);
         elementSizer.margin = 1;
         elementSizer.add(element, 1, align);
      }
      if (elementSizer) sizer.add(elementSizer);
      else sizer.add(element);
      if (name) {
         me.optControls[name] = {
            element: element,
            defaultValue: control.value,
            format: control.format,
         }
      }
      if (control.propertyName) this[control.propertyName] = element;
      return element;
   };

   this.getStatsDialog = function () {
      var sd = this.starUtils;
      if (!sd || !this.starsDetected) return null;
      var dialog = this.statsDialog;
      if (!dialog) {
         dialog = this.statsDialog = new StatsDialog(this);
      }
      return dialog;
   };

   this.showStatsDialog = function () {
      var dialog = this.getStatsDialog();
      if (!dialog) return null;
      dialog.execute();
      return dialog;
   };

   var labelW = this.font.width("Upper Peak Limit:");
   var editW = 12.0 * this.font.width('M');
   var smallNumericEditW = 5 * this.font.width('M');
   var numericEditW = 14 * this.font.width('M');
   var oneCharW = 1 * this.font.width('M');

   /* UI building */

   this.sizer = this.createVerticalSizer();
   this.mainSizer = this.createHorizontalSizer();
   this.leftSizer = this.createVerticalSizer();
   this.centerSizer = this.createVerticalSizer();
   this.rightSizer = this.createVerticalSizer();

   this.leftPanel = new Frame(this);
   this.centerPanel = new Frame(this);
   this.rightPanel = new Frame(this);
   this.leftPanel.sizer = this.leftSizer;
   this.centerPanel.sizer = this.centerSizer;
   this.rightPanel.sizer = this.rightSizer;

   /* View list */
   var viewListSizer = this.createHorizontalSizer();
   var label = new Label(this);
   with (label) {
      text = "View: ";
      textAlignment = TextAlign_Left | TextAlign_VertCenter;
      margin = 4;
      wordWrapping = true;
      setFixedWidth(me.calculateLabelFixedWidth(label) + oneCharW);
   }
   viewListSizer.add(label, 0, Align_Left);
   this.viewList = new ViewList(this);
   this.viewList.getAll();
   if (ImageWindow.activeWindow)
      this.viewList.currentView = ImageWindow.activeWindow.mainView;
   var viewId =
      (!this.viewList.currentView.isNull ? this.viewList.currentView.id : null);
   viewId = viewId || '------------';
   viewId += 'MMMMMM';
   this.viewList.setFixedWidth(this.font.width(viewId));
   viewListSizer.add(this.viewList, 1, Align_Left);

   /* Star Detection Section */
   var starDetectorBox = this.starDetectorBox = new GroupBox(this);
   with (this.starDetectorBox) {
      sizer = me.createVerticalSizer(starDetectorBox);
      StarUtilsUI.starDetector.forEach(control => {
         var element = me.createControl(control, sizer, {
            section: 'starDetector'
         });
      });
   }
   this.starDetectorSection = new SectionBar(this, 'Star Detection');
   this.starDetectorSection.setSection(this.starDetectorBox);

   /* PSF Section */
   var PSFBox = this.psfBox = new GroupBox(this);
   with (PSFBox) {
      sizer = me.createVerticalSizer(PSFBox);
      StarUtilsUI.PSF.forEach(control => {
         var element = me.createControl(control, sizer, {section: 'PSF'});
      });
   }
   this.psfSection = new SectionBar(this, 'PSF');
   this.psfSection.setSection(PSFBox);

   this.leftSizer.add(this.starDetectorSection, 1);
   this.leftSizer.add(this.starDetectorBox, 1);
   this.leftSizer.add(this.psfSection, 1);
   this.leftSizer.add(PSFBox, 1);

   var starListLbl = new Label(this);
   starListLbl.text = 'Stars';
   this.starListBox = new TreeBox(this);
   with (this.starListBox) {
      alternateRowColor = true;
      //headerVisible = false;
      rootDecoration = true;
      headerSorting = true;
      numberOfColumns = 4;
      multipleSelection = true;
      setHeaderText(0, 'ID');
      setHeaderText(1, 'Width');
      setHeaderText(2, 'Flux');
      setHeaderText(3, 'Aspect Ratio');

      setColumnWidth(0, this.font.width('MMMMMMM'));
      setColumnWidth(1, this.font.width('MMMMMM'));
      setColumnWidth(2, this.font.width('MMMMMM'));
      setColumnWidth(3, this.font.width('MMMM'));

      onNodeSelectionUpdated = function () {
         var stars = me.getSelectedStars();
         me.setPreviewImage(stars, {
            zoom: null
         });
      }

      onNodeDoubleClicked = function (node) {
         var star = node.star;
         if (star) {
            me.previewZoomToStars([star]);
         }
      }

   }
   this.previewControl = new PreviewControl(this, {
      extraButtons: [
         {
            name: 'toggleDetectedStarsBtn',
            icon: ':/icons/favorite-ok.png',
            checkable: true,
            checked: false,
            enabled: false,
            tooltip: 'Display detected stars',
            onCheck: function () {
               var zoom = me.previewControl.zoom || -100;
               if (this.checked) {
                  var bmpID = me.previewBitmapID;
                  if (bmpID === 'detectedStars') return;
                  if (bmpID) this.oldPreviewBitmapID = bmpID;
                  me.previewDisplayDetectedStars({zoom: zoom});
               } else {
                  var bmpID = this.oldPreviewBitmapID;
                  if (!bmpID) me.previewSetImageWithNoMarks({zoom: zoom});
                  else me.setPreviewImage(null, {bitmapID: bmpID, zoom: zoom});
               }
            }
         },
         {
            name: 'clearSelectedStarsBtn',
            icon: ':/icons/delete.png',
            tooltip: 'Clear selected stars',
            enabled: false,
            onClick: function () {
               var zoom = me.previewControl.zoom || -100;
               me.starListBox.selectedNodes.forEach(node => {
                  node.selected = false;
               });
               me.previewSetImageWithNoMarks({zoom: zoom});
            }
         }
      ]
   });
   this.previewControl.onCustomMouseClick = function (x, y, state, mod) {
      console.writeln(format("Preview clicked at: %.1f, %.1f", x, y));
      if (me.starUtils && me.starUtils.stars) {
         var stars = me.starUtils.stars, i = 0, starAtPos = null;
         for (i = 0; i < stars.length; i++) {
            var star = stars[i];
            if (star.rect && star.rect.includes(x, y)) {
               starAtPos = star;
               break;
            }
         }
         if (!starAtPos) return;
         var star = starAtPos;
         console.writeln("Star at point: " + starAtPos.id);
         if (star && star.node) {
            var do_add =
               (mod === KeyModifier_Control || mod === KeyModifier_Meta);
            var zoom = me.previewControl.zoom || -100;
            if (!do_add) {
               me.starListBox.selectedNodes.forEach(node => {
                  node.selected = false;
               });
               if (star.node.selected) star.node.selected = false;
               else me.starListBox.currentNode = star.node;
               me.setPreviewImage(me.getSelectedStars(), {zoom: zoom});
            } else {
               star.node.selected = !star.node.selected;
               me.setPreviewImage(me.getSelectedStars(), {zoom: zoom});
            }
         }
      }
   };
   this.previewControl.setImage(null, {});
   this.centerSizer.add(starListLbl);
   this.centerSizer.add(this.starListBox);
   this.centerSizer.add(this.previewControl);

   var maskBox = this.maskCreationBox = new GroupBox(this);
   with (maskBox) {
      title = 'Mask Creation';
      sizer = me.createVerticalSizer(maskBox);
      StarUtilsUI.maskCreation.forEach(control => {
         var element = me.createControl(control, sizer, {
            section: 'maskCreation'
         });
      });
      //setFixedHeight(me.font.width('MMMMMMMMM'));
   }

   var fixElongationBox = this.fixElongationBox = new GroupBox(this);
   with (fixElongationBox) {
      title = 'Fix Elongation';
      titleCheckBox = true;
      sizer = me.createVerticalSizer(fixElongationBox);
      StarUtilsUI.fixElongatedStars.forEach(control => {
         var element = me.createControl(control, sizer, {
            section: 'fixElongatedStars'
         });
      });
      onCheck = function () {me.updateUI();};
   }

   var reduceStarsBox = this.reduceStarsBox = new GroupBox(this);
   with (reduceStarsBox) {
      title = 'Reduce Stars';
      titleCheckBox = true;
      sizer = me.createVerticalSizer(reduceStarsBox);
      StarUtilsUI.reduceStars.forEach(control => {
         var element = me.createControl(control, sizer, {
            section: 'reduceStars'
         });
      });
      onCheck = function () {me.updateUI();};
   }

   this.rightSizer.add(maskBox);
   this.rightSizer.add(fixElongationBox);
   this.rightSizer.add(reduceStarsBox);

   this.statusSizer = this.createHorizontalSizer();
   var lbl = new Label(this);
   lbl.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   lbl.text = 'Status: ';
   lbl.setFixedWidth(this.font.width(lbl.text));
   this.statusSizer.add(lbl, 0, Align_Left);
   this.statusLabel = new Label(this);
   this.statusLabel.useRichText = true;
   this.statusLabel.text = '---';
   this.statusLabel.textAlignment = TextAlign_Left | TextAlign_VertCenter;
   this.statusSizer.add(this.statusLabel, 1, Align_Left);
   this.progressLabel = new Label(this);
   this.progressLabel.text = '';
   this.statusSizer.add(this.progressLabel, 1, Align_Left);
   lbl = new Label(this);
   lbl.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   lbl.text = ' Found stars: ';
   this.statusSizer.add(lbl, 0, Align_Right);
   this.foundStarsLabel = new Label(this);
   this.foundStarsLabel.text = '---';
   this.statusSizer.add(this.foundStarsLabel, 0, Align_Right);

   this.actionSizer = this.createHorizontalSizer();
   this.analyzeButton = new PushButton(this);
   this.analyzeButton.text = 'Detect Stars';
   this.analyzeButton.icon = this.scaledResource(":/icons/find.png");
   this.analyzeButton.toolTip = 'Start star analysis';
   this.analyzeButton.onClick = function () {
      me.startAnalysis();
   };

   this.resetButton = new PushButton(this);
   this.resetButton.text = 'Reset';
   this.resetButton.icon = this.scaledResource(":/icons/reload.png");
   this.resetButton.onClick = function () {
      me.reset();
   };

   this.statsButton = new PushButton(this);
   this.statsButton.text = 'Stats';
   this.statsButton.icon = this.scaledResource(":/icons/chart.png");
   this.statsButton.onClick = function () {
      me.showStatsDialog();
   };

   this.createMaskButton = new PushButton(this);
   this.createMaskButton.text = 'Create Mask';
   this.createMaskButton.icon = this.scaledResource(
      ":/toolbar/image-display-value.png"
   );

   this.createMaskButton.onClick = function () {
      var sd = me.starUtils;
      if (!sd || !me.starsDetected) {
         alert("No stars detected");
         return;
      }
      var maskTypeIdx = me.maskType.currentItem;
      var binarize = true;
      var dilation = true;
      var convolution = true;
      var postprocess = binarize || dilation || convolution;
      var imageWin = null;
      if (maskTypeIdx === 0) {
         /* Selected Stars */
         var stars = me.getSelectedStars();
         imageWin = sd.createStarMask(stars, {
            binarize: binarize,
            convolution: convolution,
            dilation: dilation,
         });
         imageWin.bringToFront();
      } else if (maskTypeIdx === 1) {
         /* Undetected stars */
         imageWin = sd.displayUndetectedStars({mono: true});
         view = imageWin.mainView;
         if (postprocess) view.beginProcess(UndoFlag_NoSwapFile);
         if (binarize) sd.binarize(view, 0.25);
         if (convolution) {
            var stdDev = (!isNaN(convolution) ? convolution : null);
            if (stdDev === true) stdDev = null;
            stdDev = stdDev || 2;
            sd.convolution(view, stdDev);
         }
         if (postprocess) view.endProcess();
         imageWin.bringToFront();
      } else if (maskTypeIdx === 2) {
         /* Custom Selection */

      }
   };

   this.fixButton = new PushButton(this);
   this.fixButton.text = 'Fix Stars';
   this.fixButton.icon = this.scaledResource(":/icons/process.png");
   this.fixButton.onClick = function () {
      var sd = me.starUtils;
      if (!sd || !me.starsDetected) {
         alert("No stars detected");
         return;
      }
      var doFixElongation = me.fixElongationBox.checked;
      var doReduce = me.reduceStarsBox.checked;
      if (!doFixElongation && !doReduce) {
         alert("Both 'Fix Elongated Stars' && 'Reduce Stars' are disabled");
         return;
      }
      me.enabled = false;
      try {
         if (doFixElongation) {
            var threshold = me.fixElongatedStarsThreshold.value;
            var keepMask = me.fixElongatedStarsKeepMasks.checked;
            console.noteln(threshold);
            var fixOpts = {
               threshold: threshold,
               keepMask: keepMask
            };
            sd.fixElongatedStars(fixOpts);
         }
         me.progressBar.updateProgress(0, 0);
         if (doReduce) {
            var selection = me.reduceStarsSelection.value;
            sd.reduceStars(null, null, {selection: selection});
         }
      } catch (e) {
         me.deleteStarUtils();
         me.analyzeButton.enabled = true;
         me.alert("Execution error");
         me.cancel();
         throw e;
      }
      me.enabled = true;
   };

   this.closeButton = new PushButton(this);
   this.closeButton.text = 'Close';
   this.closeButton.icon = this.scaledResource(":/icons/close.png");
   this.closeButton.onClick = function () {
      me.deleteStarUtils();
      me.cancel();
   }

   this.actionSizer.add(this.analyzeButton);
   this.actionSizer.add(this.resetButton);
   this.actionSizer.add(this.statsButton);
   this.actionSizer.add(this.createMaskButton);
   this.actionSizer.add(this.fixButton);
   this.actionSizer.add(this.closeButton);

   this.progressBar = new ProgressBar(this, {
      trackColor: 0x5AAAAAAA,
      progressColor: 0xFF7DA6AB,
      getProgressText: function (cur, tot, percentage) {
         return percentage + '%';
      }
   });

   this.mainSizer.add(this.leftPanel);
   this.mainSizer.add(this.centerPanel);
   this.mainSizer.add(this.rightPanel);
   this.sizer.add(viewListSizer, 0);
   this.sizer.add(this.mainSizer);
   this.sizer.add(this.progressBar);
   this.sizer.add(this.statusSizer);
   this.sizer.add(this.actionSizer);

   this.windowTitle = "StarUtils";
   this.adjustToContents();
};

StarUtilsDialog.prototype = new Dialog;

function main() {
   console.abortEnabled = true;
   var dialog = new StarUtilsDialog();
   dialog.restyle();
   do {
      var res = dialog.execute();
   } while (res);
}

main();
