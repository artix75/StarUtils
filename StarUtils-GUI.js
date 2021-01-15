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
#include <pjsr/StdDialogCode.jsh>

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
               //label: 'Percentage',
               name: 'detectPSFThreshold.width',
               propertyName: 'psfThresholdWidth',
               type: HorizontalSlider,
               value: 25,
               range: [0, 100],
               format: '%d%%',
               outputLabel: true,
               onValueUpdated: 'onPSFThresholdUpdated',
               tip: "Width threshold for PSF data extraction. With lower values,\n"+
                    "PSF will be calculated for more stars, but star detection\n"+
                    "will take more time."
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
               //label: 'Percentage',
               name: 'detectPSFThreshold.flux',
               propertyName: 'psfThresholdFlux',
               type: HorizontalSlider,
               value: 15,
               range: [0, 100],
               format: '%d%%',
               outputLabel: true,
               onValueUpdated: 'onPSFThresholdUpdated',
               tip: "Flux threshold for PSF data extraction. With lower values,\n"+
                    "PSF will be calculated for more stars, but star detection\n"+
                    "will take more time."
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
         tip: "Width threshold to determine which stars will be used for the mask.\n"+
              "Lower values will select more stars."
      },
      {
         label: 'Flux',
         propertyName: 'maskStarWidthThreshold',
         type: HorizontalSlider,
         value: 50,
         range: [0, 100],
         format: '%d%%',
         outputLabel: true,
         tip: "Flux threshold to determine which stars will be used for the mask.\n"+
              "Lower values will select more stars."
      },
   ],
   fixElongatedStars: [
      {
         label: 'Threshold',
         propertyName: 'fixElongatedStarsThreshold',
         type: NumericControl,
         value: 0.9,
         range: [0, 1],
         tip: "Threshold for the star\'s aspect ratio. Only stars having an \n"+
              "aspect ratio lower than this threshold will be fixed.\n" +
              "(A perfect rounded star has an aspect ratio of 1)"
      },
      {
         label: 'Fix Factor',
         propertyName: 'fixElongatedStarsFixFactor',
         type: NumericControl,
         value: 1,
         range: [0.1, 1],
         tip: "Lower this value in order to apply a smaller fix"
      },
      {
         label: 'Only fix selected stars',
         propertyName: 'fixElongatedStarsOnlySelected',
         type: CheckBox,
         checked: false,
         //tip: "Keep masks used to fix stars",
      },
      {
         label: 'Keep Mask',
         propertyName: 'fixElongatedStarsKeepMasks',
         type: CheckBox,
         checked: true,
         tip: "Keep mask used to fix stars",
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
   ],
   fixOptions: [
      {
         label: 'Create Process Container',
         propertyName: 'fixCreateProcessContainer',
         type: CheckBox,
         checked: false,
         onCheck: 'onCreateProcessContainerCheck',
         tip: "Create a ProcessContainer instance containing all processes\n"+
              "applied to fix stars",
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
      this.updateZoom(metadata.zoom || this.zoomThatFits());
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

   this.zoomThatFits = function () {
      var imgW = this.metadata.width, imgH = this.metadata.height,
      vpW = this.scrollbox.viewport.width,
      vpH = this.scrollbox.viewport.height;
      return Math.min(vpW / imgW, vpH / imgH);
   };

   this.zoomToFit = function () {
      var zoom = this.zoomThatFits();
      this.updateZoom(zoom);
   };

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
      preview.Xval_Label.text = Math.round(p.x).toString();
      preview.Yval_Label.text = Math.round(p.y).toString();

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

   this.scrollbox.viewport.onMouseDoubleClick = function (x, y, button, state,
      modifiers)
   {
      var preview = this.parent.parent;
      var p =  preview.transform(x, y, preview);
      if (!p || isNaN(p.x) || isNaN(p.y)) return;
      if (preview.onCustomMouseDoubleClick) {
         preview.onCustomMouseDoubleClick.call(this, p.x, p.y, button, state,
            modifiers);
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

   this.statsLabels = {avg: 'mean'};

   this.renderStatsRow = function (field, value, parentNode) {
      field = this.statsLabels[field] || field;
      var name = capitalizedString(field.replace(/_+/g, ' '));
      var node = new TreeBoxNode;
      node.setText(0, name + ': ');
      node.setAlignment(0, Align_Left);
      var valueLbl;
      if (typeof(value) === 'string' && value.match(/^[\d\.\-\+]+$/))
         valueLbl = format('%.2f', parseFloat(value) || 0);
      else if (!isNaN(value)) valueLbl = format('%.2f', parseFloat(value) || 0);
      else valueLbl = '' + value;
      node.setText(1, valueLbl);
      node.setAlignment(1, Align_Right);
      parentNode.add(node);
   }

   this.drawCharts = function () {
      if (!this.starUtils) return;
      var widthChartImage = this.starUtils.widthChartImage;
      var widthDistChartImage = this.starUtils.widthDistChartImage;
      if (!widthChartImage) {
         var res = this.starUtils.drawPlot('width', {
            title: 'Stars by Width',
            drawToWindow: false,
            grouped: false,
            drawPercentageLines: {'25%': true, '50%': true, '75%': true}
         });
         if (!res || !res.created) {
            var err = "Failed to create charts!";
            if (res.error) err += "\n" + res.error;
            parent.alert(err);
            return;
         }
         var imageFile = res.imageFile;
         widthChartImage = new Bitmap(imageFile);
         this.starUtils.widthChartImage = widthChartImage;
      }

      this.widthChart.setImage(widthChartImage, {
         width: widthChartImage.width,
         height: widthChartImage.height
      });

      if (!widthDistChartImage) {
         res = this.starUtils.drawPlot('width', {
            title: 'Star Width Distribution',
            drawToWindow: false,
            grouped: true,
            drawPercentageLines: {'25%': true, '50%': true, '75%': true}
         });
         if (!res.created) {
            parent.alert("Failed to create charts!");
            return;
         }
         imageFile = res.imageFile;
         widthDistChartImage = new Bitmap(imageFile);
         this.starUtils.widthDistChartImage = widthDistChartImage;
      }

      this.widthDistChart.setImage(widthDistChartImage, {
         width: widthDistChartImage.width,
         height: widthDistChartImage.height
      });
   }

   this.updateStats = function () {
      if (!this.starUtils) return;
      var stats = this.starUtils.stats;

      /* Global Stats */
      var starsWithPSF = this.starUtils.starsWithPSF.length;
      var globalStats = {
         Detected_Stars: this.starUtils.stars.length,
         Stars_with_PSF: format('%d (%d%%)', starsWithPSF,
            Math.round((starsWithPSF / this.starUtils.stars.length)*100)
         ),
      };
      var psfStats = (stats.psf || {});
      Object.keys(psfStats).forEach(psfProp => {
         var propStats = psfStats[psfProp] || {};
         Object.keys(propStats).forEach(property => {
            var name = capitalizedString(psfProp) + '_' +
               capitalizedString(property);
            globalStats[name] = propStats[property];
         });
      });

      this.generalStatsNode = new TreeBoxNode();
      this.generalStatsNode.setText(0, "General");
      Object.keys(globalStats).forEach(property => {
         var value = globalStats[property];
         me.renderStatsRow(property, value, this.generalStatsNode);
      });
      this.statsBox.add(this.generalStatsNode);
      this.generalStatsNode.expanded = true;

      ['width', 'flux'].forEach(function (property) {
         var name = capitalizedString(property);
         var dtlStats = stats[property];
         var statsNode = me[property + 'Node'] = new TreeBoxNode();
         statsNode.setText(0, name);
         Object.keys(dtlStats).forEach(field => {
            var value = dtlStats[field];
            me.renderStatsRow(field, value, statsNode);
         });
         me.statsBox.add(statsNode);
         statsNode.expanded = true;
      });
      for (i = 0; i < me.statsBox.numberOfColumns; i++) {
         me.statsBox.adjustColumnWidthToContents(i);
      }
   };

   this.starUtils = parent.starUtils;
   this.sizer = parent.createVerticalSizer(this);
   this.tabBox = new TabBox(this);

   var previewOpts = {minWidth: 640, minHeight: 532};
   this.widthChart = new PreviewControl(this, previewOpts);
   this.widthChart.setImage(null, {});
   this.widthDistChart = new PreviewControl(this, previewOpts);
   this.widthDistChart.setImage(null, {});
   this.tabBox.addPage(this.widthChart, 'Stars by width');
   this.tabBox.addPage(this.widthDistChart, 'Star width distribution');
   this.sizer.add(this.tabBox);

   this.statsBox = new TreeBox(this);
   var par = parent;
   with (this.statsBox) {
      headerSorting = false;
      headerVisible = false;
      numberOfColumns = 2;
   }
   this.sizer.add(this.statsBox);
   this.sizer.addStretch();

   this.onExecute = function () {
      try {
         me.updateStats();
         me.drawCharts();
      } catch (e) {
         me.error = e;
         me.result = StdDialogCode_Cancel;
      }
   };

   this.onShow = function () {
      if (this.error) {
         var errmsg = "Error executing Stats Dialog:\n" + this.error.message;
         var t = new Timer(2, false);
         t.onTimeout = function () {
            me.parent.exception = me.error;
            me.parent.alert(errmsg);
            me.cancel();
         };
         t.start();
      }
   }

   this.windowTitle = "StarUtils Statistics";
   this.adjustToContents();
}

StatsDialog.prototype = new Dialog;

function CalculatePSFDialog(parent) {
   this.__base__ = Dialog;
   this.__base__(parent);
   var me = this;
   this.starUtils = parent.starUtils;

   this.updateStarCount = function () {
      var count = 0;
      var onlySelected = me.onlySelectedStarsCheckbox.checked;
      if (onlySelected) {
         count = me.parent.starListBox.selectedNodes.length;
      } else {
         var stars = me.starUtils.stars.filter(star => !star.psf);
         var widthThreshold = 0, fluxThreshold = 0;
         if (me.widthThreshold.enabled) widthThreshold = me.widthThreshold.value;
         if (me.fluxThreshold.enabled) fluxThreshold  = me.fluxThreshold.value;
         stars = stars.filter(star => {
            return star.width > widthThreshold && star.flux > fluxThreshold;
         });
         count = stars.length;
      }
      var total = count + me.starUtils.starsWithPSF.length;
      me.psfFoundStarsLabel.text = format('%d star(s) - total: %d',
         count, total);
   };

   var stars = this.starUtils.starsWithPSF;
   var minWidth = null;
   var minFlux = null;
   stars.forEach(star => {
      if (minWidth === null || star.width < minWidth) minWidth = star.width;
      if (minFlux === null || star.flux < minFlux) minFlux = star.flux;
   });
   if (!minWidth) minWidth = this.starUtils.stats.width.min;
   if (!minFlux) minFlux = this.starUtils.stats.flux.min;
   var minimums = {width: minWidth, flux: minFlux}

   this.sizer = parent.createVerticalSizer(this);
   this.thresholdBoxes = [];
   var onChange = function () {me.updateStarCount()};
   ['width', 'flux'].forEach(property => {
      var box = new GroupBox(me);
      with (box) {
         title = 'Star ' + capitalizedString(property) + ' Threshold';
         titleCheckBox = true;
         sizer = me.parent.createHorizontalSizer(box);
         var control = me[property + 'Threshold'] = new NumericControl(me);
         control.setRange(0, minimums[property]);
         control.setPrecision(2);
         control.setValue(minimums[property] / 2);
         sizer.add(control);
         control.setFixedWidth(me.font.width('MMMMMMMMMMMMMMMMMMMMM'));
         control.toolTip = "Width threshold for PSF data extraction. " +
           + capitalizedString(property) + " lower values,\n"+
           "PSF will be calculated for more stars, but star detection\n"+
           "will take more time.";
         control.onValueUpdated = onChange;
         sizer.addStretch();
      }
      box.onCheck = onChange;
      me.sizer.add(box);
      me.thresholdBoxes.push(box);
   });

   var checkBoxSizer = parent.createHorizontalSizer();
   var onlySelectedCheck = this.onlySelectedStarsCheckbox = new CheckBox(this);
   onlySelectedCheck.checked = false;
   onlySelectedCheck.onCheck = function (checked) {
      me.thresholdBoxes.forEach(box => {
         box.checked = !checked;
         box.enabled = !checked;
      });
      me.updateStarCount();
   }
   onlySelectedCheck.enabled = this.parent.starListBox.selectedNodes.length > 0;
   var label = new Label;
   label.text = 'Only for selected stars';
   checkBoxSizer.add(onlySelectedCheck);
   checkBoxSizer.add(label, 1, Align_Left);
   checkBoxSizer.addStretch();

   var infoSizer = parent.createHorizontalSizer();;
   this.psfFoundStarsLabel = new Label(this);
   this.psfFoundStarsLabel.textAlignment = TextAlign_Center |
      TextAlign_VertCenter;
   this.psfFoundStarsLabel.text = '';
   infoSizer.add(this.psfFoundStarsLabel);

   var buttonsSizer = parent.createHorizontalSizer();
   this.calculateButton = new PushButton(this);
   this.calculateButton.text = 'Calculate PSF';
   this.calculateButton.icon = this.scaledResource(":/icons/process.png");
   this.cancelButton = new PushButton(this);
   this.cancelButton.text = 'Cancel';
   this.cancelButton.icon = this.scaledResource(":/icons/close.png");
   this.calculateButton.onClick = function () {
      me.ok();
   }
   this.cancelButton.onClick = function () {
      me.cancel();
   }
   buttonsSizer.add(this.calculateButton);
   buttonsSizer.add(this.cancelButton);

   this.onReturn = function () {
      var res = {};
      if (onlySelectedCheck.checked) res.onlySelected = true;
      else {
         res.threshold = {};
         if (me.widthThreshold.enabled)
            res.threshold.width = me.widthThreshold.value;
         if (me.fluxThreshold.enabled)
            res.threshold.flux = me.fluxThreshold.value;
      }
      parent.psfCalcOptions = res;
   };

   this.sizer.add(checkBoxSizer);
   this.sizer.add(infoSizer);
   this.sizer.add(buttonsSizer);
   this.sizer.addStretch();

   this.updateStarCount();
   this.windowTitle = "StarUtils PSF Parameters";
   this.adjustToContents();
}

CalculatePSFDialog.prototype = new Dialog;

function StarUtilsDialog (options) {

   this.__base__ = Dialog;
   this.__base__();
   this.options = options || {};

   this.starUtils = null;
   this.optControls = {};
   this.imageStars = {};
   this.status = null;
   this.detecting = false;
   this.abortRequested = false;
   var me = this;

   this.onClose = function (retval) {
      if (me.starUtils) {
         me.starUtils.abort();
         me.deleteStarUtils();
      }
      me.abortRequested = true;
      console.hide();
   };

   this.onShow = function () {
      me.updateUI();
      me.restyle();
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
         this.onStatusUpdate('Closing temporary images');
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
      this.status = status;
      this.detecting = (status.toLowerCase() === 'detecting stars');
      if (status) status = '<b>' + status + '</b>';
      this.statusLabel.text = status || '---';
   }

   this.onProgressUpdate = function (progress, tot) {
      if (!tot || tot === 0) {
         this.progressLabel.text = '';
         return;
      }
      if (!this.detecting)
         this.progressLabel.text = progress + '/' + tot;
      else
         this.progressLabel.text = '';
      this.progressBar.updateProgress(progress, tot);
   };

   this.updateFoundStarsLabel = function () {
      if (!this.starUtils || !this.starsDetected) {
         this.foundStarsLabel.text = '---';
         return;
      }
      var sd = this.starUtils;
      var count = sd.stars.length;
      var withPSFCount = (sd.starsWithPSF || []).length;
      this.foundStarsLabel.text = format('%d (PSF on: %d%%)',
         count, Math.round((withPSFCount / count)*100)
      );
   };

   this.updatePSFStarsLabel = function () {
      var view = this.viewList.currentView;
      if (!view) {
         this.psfFoundStarsLabel.text = '';
         return;
      }
      var stars = this.imageStars[view.fullId];
      if (!stars) {
         this.psfFoundStarsLabel.text = '';
         return;
      }
      var widthThreshold = this.psfThresholdWidth.value;
      var fluxThreshold = this.psfThresholdFlux.value;
      var widths = stars.map(star => star.width);
      var fluxes = stars.map(star => star.flux);
      var getValueByPercentage = StarUtils.prototype.getValueByPercentage;
      widthThreshold = getValueByPercentage.call(me, widthThreshold, widths);
      fluxThreshold = getValueByPercentage.call(me, fluxThreshold, fluxes);
      stars = stars.filter(star => {
         return star.width > widthThreshold && star.flux > fluxThreshold;
      });
      this.psfFoundStarsLabel.text = format('%d star(s)', stars.length);
   }

   this.updateStarListNode = function (node, star) {
      node.setText(0, star.id);
      node.setText(1, format('%.2f', star.width));
      node.setText(2, format('%.2f', star.flux));
      if (star.psf){
         node.setText(3, format('%.2f', star.psf.aspectRatio));
         node.setText(4, format('%.2f', star.psf.angle));
      } else {
         node.setText(3,'---');
         node.setText(4,'---');
      }
      var tooltip = ['x', 'y'].map(prop => {
         var lbl = padString(prop.toUpperCase() + ':', 3);
         return format('<b>%s</b> %.2f', lbl, star.pos[prop]);
      }).join("<br>");
      if (star.psf) {
         tooltip += "<br><br><b>PSF</b><br><br>";
         tooltip += ['cx', 'cy', 'sx', 'sy', 'FWHMx', 'FWHMy'].map(prop => {
            var lbl = padString(prop + ':', 6);
            return format('<b>%s</b> %.2f', lbl, star.psf[prop]);
         }).join("<br>");
      }
      tooltip +=
      '<br><br><i>Click to select, double click to zoom on star</i>';
      for (let i = 0; i < 5; i++)
         node.setToolTip(i, tooltip);
   };

   this.populateStarList = function (stars) {
      this.starListBox.clear();
      if (!stars && this.starUtils) stars = this.starUtils.stars;
      if (!stars) return;
      var listBox = this.starListBox;
      stars.forEach(star => {
         var node = new TreeBoxNode();
         me.updateStarListNode(node, star);
         for (c = 1; c < listBox.numberOfColumns; c++) {
            node.setAlignment(c, Align_Right);
         }
         node.star = star;
         star.node = node;
         listBox.add(node);
      });
      for (c = 0; c < listBox.numberOfColumns; c++) {
         listBox.adjustColumnWidthToContents(c);
      }
   };

   this.updateStarList = function (stars) {
      if (!stars && this.starUtils) stars = this.starUtils.stars;
      if (!stars) return;
      var starData = {};
      stars.forEach(star => {
         starData[star.id] = star;
      });
      var listBox = this.starListBox;
      var nodeCount = listBox.numberOfChildren, i;
      for (i = 0; i < nodeCount; i++) {
         var node = listBox.child(i);
         if (!node.star) {
            console.warningln("WARN: starList node " + i + " has no star!");
            continue;
         }
         var star = starData[node.star.id];
         if (!star) continue;
         me.updateStarListNode(node, star);
      }
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

   this.getStarAtPosition = function (x, y) {
      if (!this.starUtils) return null;
      var stars = this.starUtils.stars, i = 0, starAtPos = null;
      for (i = 0; i < stars.length; i++) {
         var star = stars[i];
         if (star.rect && star.rect.includes(x, y)) {
            starAtPos = star;
            break;
         }
      }
      return starAtPos;
   }

   this.updateSelectedStarsLabel = function () {
      me.selectedStarsCountLabel.text = format(' (%d selected)',
         me.starListBox.selectedNodes.length);
   };

   this.updateUI = function (opts) {
      opts = opts || {};
      var curPos = this.position, curWidth = this.width,
          curHeight = this.height;
      var collapsablePanels = this.options.collapsablePanels !== false &&
                              opts.collapsePanels !== false;
      if (!this.starUtils || !this.starsDetected) {
         this.viewList.enabled = true;
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
            this.statsButton.hide();
            this.createMaskButton.hide();
         }
      } else {
         this.viewList.enabled = false;
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
            this.statsButton.show();
            this.createMaskButton.show();
         }
      }
      this.updateSelectedStarsLabel();
      this.updatePSFStarsLabel();
      this.adjustToContents();
      if (this.visible) {
         /* Re-center dialog */
         var newWidth = this.width, newHeight = this.height, newX = null,
             newY = null;
         if (newWidth != curWidth) newX = curPos.x -
            ((newWidth - curWidth) / 2);
         if (newHeight != curHeight) newY = curPos.y -
            ((newHeight - curHeight) / 2);
         if (newX !== null || newHeight !== null) {
            if (newX === null) newX = curPos.x;
            if (newY === null) newY = curPos.y;
            this.move(newX, newY);
         }
      }
   };

   this.reset = function (opts) {
      opts = opts || {};
      this.enabled = false;
      this.deleteStarUtils();
      this.settingPreviewBitmapWithID = null;
      this.previewBitmapID = null;
      this.zoomPreviewToStar = null;
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
      this.updateUI({collapsePanels: opts.collapsePanels !== false});
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
         if (me.abortRequested) return;
         this.foundStarsLabel.text = '' + sd.stars.length;
         sd.setLimits();
         sd.classifyStars();
         this.onStatusUpdate('Done');
         this.onProgressUpdate(0,0);
         if (me.abortRequested) return;
         this.resetButton.enabled = true;
         this.populateStarList(sd.stars);
         this.starsDetected = (sd.stars.length > 0);
         this.imageStars[sd.win.currentView.fullId] = sd.stars;
         this.updateFoundStarsLabel();
         this.updateUI();
         this.previewDisplayDetectedStars();
         with (this.previewControl.toggleDetectedStarsBtn) {
            checked = true;
            enabled = true;
         }
         this.previewControl.clearSelectedStarsBtn.enabled = true;
         if (sd.starsWithPSF.length === 0) {
            this.alert("Warning: no star has PSF data. Try lowering PSF " +
               "thresholds");
         }
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

   this.calculatePSF = function(opts) {
      opts = opts || {};
      var stars = null, threshold = null;
      if (opts.onlySelected) {
         stars = this.getSelectedStars();
         if (stars.length === 0) {
            this.alert("No stars selected!");
            return;
         }
         stars = stars.filter(star => !star.psf);
         if (stars.length === 0) {
            this.alert("Selected stars already have PSF data!");
            return;
         }
         threshold = {width: 0, flux: 0};
      } else threshold = opts.threshold;
      if (!stars && (!threshold || Object.keys(threshold).length === 0)) {
         threshold = {width: 0, flux: 0};
      }
      this.enabled = false;
      try {
         var recalculatedStars = this.starUtils.recalculatePSF(stars, {
            detectPSFThreshold: threshold,
            updateProgress: true,
         });
         console.noteln("Recalculated PSF on " + recalculatedStars.length +
            " star(s)");
         this.updateFoundStarsLabel();
         this.updatePSFStarsLabel();
         this.updateStarList(recalculatedStars);
         this.updateUI();
      } catch (e) {
         me.deleteStarUtils();
         me.alert("Execution error");
         me.cancel();
         throw e;
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
      if (align === undefined) align = Align_Default;
      var elementSizer = null;
      var isGroupBox = (type === GroupBox);
      var isButton = (type === PushButton);
      var isCheckbox = (type === CheckBox);
      if (!isGroupBox && !isButton && label) {
         var txt = label;
         label = new Label(element);
         label.text = txt;
         if (!isCheckbox) label.text += ':';
         var lblAlign = (isCheckbox ? TextAlign_Left : TextAlign_Right);
         label.textAlignment = lblAlign | TextAlign_VertCenter;
         var labelWidth = opts.labelWidth || control.labelWidth;
         if (!labelWidth && opts.section)
            labelWidth = this.calculateLabelFixedWidth(label, opts.section);
         labelWidth = labelWidth || labelW;
         if (!isCheckbox)label.setFixedWidth(labelWidth);
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
         var precision = control.precision || 2;
         if (element.setPrecision) element.setPrecision(precision);
         //var extraSizer = null;
         //element.setFixedWidth(numericEditW);
         var elemAlign = align;
         elementSizer = me.createHorizontalSizer(sizer);
         if (label) elementSizer.add(label, 0, align);
         if (type === SpinBox || type === HorizontalSlider) {
            elementSizer.addUnscaledSpacing(oneCharW);
            if (type === SpinBox) elemAlign = Align_Left;
         }
         elementSizer.add(element, 1, elemAlign);
         /*if (type === SpinBox) {
            //element.setFixedWidth(numericEditW);
            //elementSizer.addUnscaledSpacing(numericEditW);
         } else if (type === HorizontalSlider) {
            //element.setFixedWidth(numericEditW);
         }*/
         var onValueUpdated = control.onValueUpdated;
         if (onValueUpdated && typeof(onValueUpdated) === 'string')
            onValueUpdated = me[onValueUpdated] || null;
         var updateOutputLabel = null;
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
            //element.onValueUpdated = updateText;
            updateOutputLabel = updateText;
            elementSizer.add(outputLabel, 1, align);
         }
         if (onValueUpdated || updateOutputLabel) {
            element.onValueUpdated  = function (val) {
               if (updateOutputLabel) updateOutputLabel.call(element, val);
               if (onValueUpdated) onValueUpdated.call(element, val);
            }
         }
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
         var onCheck = control.onCheck;
         if (typeof(onCheck) === 'string') onCheck = me[onCheck];
         if (onCheck) element.onCheck = onCheck;
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
      try {
         this.exception = null;
         var dialog = this.getStatsDialog();
         if (!dialog) return null;
         var res = dialog.execute();
         if (this.exception) throw this.exception;
         return dialog;
      } catch (e) {
         me.deleteStarUtils();
         me.cancel();
         throw(e);
      }
   };

   this.showCalculatePSFDialog = function () {
      try {
         this.exception = null;
         this.psfCalcOptions = null;
         var dialog = new CalculatePSFDialog(this);
         if (!dialog) return null;
         var res = dialog.execute();
         if (this.exception) throw this.exception;
         if (res === StdDialogCode_Ok) {
            if (this.psfCalcOptions) {
               //console.noteln(JSON.stringify(this.psfCalcOptions,null,4));
               this.calculatePSF(this.psfCalcOptions);
            }
         }
         return dialog;
      } catch (e) {
         me.deleteStarUtils();
         me.cancel();
         throw(e);
      }
   };

   this.fixStars = function () {
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
      var processContainer = this.processContainer = null;
      if (this.fixCreateProcessContainer.checked)
         processContainer = this.processContainer = new ProcessContainer;
      me.enabled = false;
      try {
         if (doFixElongation) {
            var threshold = me.fixElongatedStarsThreshold.value;
            var factor = me.fixElongatedStarsFixFactor.value;
            var keepMask = me.fixElongatedStarsKeepMasks.checked;
            var filter = null;
            if (me.fixElongatedStarsOnlySelected.checked) {
               var stars = me.getSelectedStars();
               var selected = {};
               stars.forEach(star => {selected[star.id] = true});
               filter = function (star) {return selected[star.id] === true};
            }
            var fixOpts = {
               threshold: threshold,
               fixFactor: factor,
               keepMask: keepMask,
               filter: filter,
               processContainer: processContainer,
            };
            sd.fixElongatedStars(fixOpts);
         }
         if (me.abortRequested) return;
         me.progressBar.updateProgress(0, 0);
         if (doReduce) {
            var selection = me.reduceStarsSelection.value;
            var reduceOptions = {
               selection: selection,
               processContainer: processContainer,
            };
            sd.reduceStars(null, null, reduceOptions);
         }
         if (me.abortRequested) return;
         var question = "Star fixing completed. Do you want to rescan image?";
         var msgBox = new MessageBox(question, "StarUtils", StdIcon_Question,
            StdButton_Yes, StdButton_No);
         var res = msgBox.execute();
         if (res === StdButton_No) {
            me.deleteStarUtils();
            me.cancel();
            return;
         }
         if (processContainer) processContainer.launchInterface();
         me.reset({collapsePanels: false});
         me.startAnalysis();
      } catch (e) {
         me.deleteStarUtils();
         me.analyzeButton.enabled = true;
         me.alert("Execution error");
         me.cancel();
         throw e;
      }
      me.enabled = true;
      delete me.imageStars[sd.win.currentView.fullId];
   };

   /* Event Handlers */

   this.onPSFThresholdUpdated = function (val) {
      var view = me.viewList.currentView;
      if (!view) return;
      var stars = me.imageStars[view.fullId];
      if (!stars) return;
      me.updatePSFStarsLabel();
   };

   this.onCreateProcessContainerCheck = function (checked) {
      if (checked)
         me.alert("Warning: this option could generate too much mask images!");
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
   this.viewList.onViewSelected = function (v) {
      me.updateUI();
   }

   /* Star Detection Section */
   var starDetectorBox = this.starDetectorBox = new GroupBox(this);
   with (this.starDetectorBox) {
      sizer = me.createVerticalSizer(starDetectorBox);
      StarUtilsUI.starDetector.forEach(control => {
         var element = me.createControl(control, sizer, {
            section: 'starDetector'
         });
      });
      sizer.addStretch();
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
      sizer.addStretch();
   }
   this.psfFoundStarsLabel = new Label(this);
   this.psfFoundStarsLabel.textAlignment = TextAlign_Center |
      TextAlign_VertCenter;
   this.psfFoundStarsLabel.text = '';
   PSFBox.sizer.add(this.psfFoundStarsLabel);

   this.psfSection = new SectionBar(this, 'PSF');
   this.psfSection.setSection(PSFBox);

   this.leftSizer.add(this.starDetectorSection, 1);
   this.leftSizer.add(this.starDetectorBox, 1);
   this.leftSizer.add(this.psfSection, 1);
   this.leftSizer.add(PSFBox, 1);
   this.leftSizer.addStretch();

   var starListLabelSizer = this.createHorizontalSizer();
   var starListLbl = new Label(this);
   starListLbl.text = 'Stars';
   this.selectedStarsCountLabel = new Label(this);
   this.selectedStarsCountLabel.text = '';
   starListLabelSizer.add(starListLbl, 0, Align_Left);
   starListLabelSizer.add(this.selectedStarsCountLabel, 1, Align_Left);
   this.calculatePSFButton = new PushButton(this);
   this.calculatePSFButton.text = 'Calculate PSF';
   this.calculatePSFButton.toolTip =
      "Calculate PSF for stars that are currently missing it";
   this.calculatePSFButton.onClick = function () {
      me.showCalculatePSFDialog();
   };
   starListLabelSizer.addStretch();
   starListLabelSizer.add(this.calculatePSFButton, 0, Align_Right);

   this.starListBox = new TreeBox(this);
   with (this.starListBox) {
      alternateRowColor = true;
      //headerVisible = false;
      rootDecoration = true;
      headerSorting = true;
      numberOfColumns = 5;
      multipleSelection = true;
      setHeaderText(0, 'ID');
      setHeaderText(1, 'Width');
      setHeaderText(2, 'Flux');
      setHeaderText(3, 'Aspect Ratio');
      setHeaderText(4, 'Angle');

      setColumnWidth(0, this.font.width('MMMMMMM'));
      setColumnWidth(1, this.font.width('MMMMMM'));
      setColumnWidth(2, this.font.width('MMMMMM'));
      setColumnWidth(3, this.font.width('MMMM'));
      setColumnWidth(4, this.font.width('MMMM'));

      onNodeSelectionUpdated = function () {
         var stars = me.getSelectedStars();
         me.updateSelectedStarsLabel();
         me.setPreviewImage(stars, {
            zoom: null
         });
      }

      onNodeDoubleClicked = function (node) {
         var star = node.star;
         me.updateSelectedStarsLabel();
         if (star) {
            me.previewZoomToStars([star]);
         }
      }

   }
   this.previewControl = new PreviewControl(this, {
      minWidth: 480,
      minHeight :360,
      extraButtons: [
         {
            name: 'toggleDetectedStarsBtn',
            icon: ':/icons/favorite-ok.png',
            checkable: true,
            checked: false,
            enabled: false,
            tooltip: 'Display detected stars',
            onCheck: function () {
               var zoom = me.previewControl.zoom ||
                          me.previewControl.zoomThatFits;
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
               var zoom = me.previewControl.zoom ||
                          me.previewControl.zoomThatFits;
               me.starListBox.selectedNodes.forEach(node => {
                  node.selected = false;
               });
               me.updateSelectedStarsLabel();
               me.previewSetImageWithNoMarks({zoom: zoom});
            }
         }
      ]
   });
   this.previewControl.onCustomMouseClick = function (x, y, state, mod) {
      console.writeln(format("Preview clicked at: %.1f, %.1f", x, y));
      if (me.starUtils && me.starUtils.stars) {
         var star = me.getStarAtPosition(x, y);
         if (!star) return;
         console.writeln("Star at point: " + star.id);
         if (star.node) {
            var do_add =
               (mod === KeyModifier_Control || mod === KeyModifier_Meta);
            var zoom = me.previewControl.zoom || me.previewControl.zoomThatFits;
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
            me.updateSelectedStarsLabel();
         }
      }
   };

   this.previewControl.onCustomMouseDoubleClick = function (x, y, state, mod) {
      var star = me.getStarAtPosition(x, y);
      if (!star) return;
      if (star.node) {
         me.starListBox.selectedNodes.forEach(node => {
            node.selected = false;
         });
         me.starListBox.currentNode = star.node;
         me.setPreviewImage(me.getSelectedStars());
         me.previewZoomToStars([star]);
         me.updateSelectedStarsLabel();
      }
   };
   this.previewControl.setImage(null, {});
   this.centerSizer.add(starListLabelSizer);
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
      sizer.addStretch();
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
      sizer.addStretch();
   }

   var fixOptionsBox = this.fixOptionsBox = new GroupBox(this);
   with (fixOptionsBox) {
      title = 'Fix Options';
      titleCheckBox = false;
      sizer = me.createVerticalSizer(reduceStarsBox);
      StarUtilsUI.fixOptions.forEach(control => {
         var element = me.createControl(control, sizer, {
            section: 'fixOptions'
         });
      });
      sizer.addStretch();
   }

   this.rightSizer.add(maskBox);
   this.rightSizer.add(fixElongationBox);
   this.rightSizer.add(reduceStarsBox);
   this.rightSizer.add(fixOptionsBox);
   this.rightSizer.addStretch();

   this.statusSizer = this.createHorizontalSizer();
   var leftStatusSizer = this.createHorizontalSizer();
   var middleStatusSizer = this.createHorizontalSizer();
   var rightStatusSizer = this.createHorizontalSizer();
   var lbl = new Label(this);
   lbl.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   lbl.text = 'Status: ';
   lbl.setFixedWidth(this.font.width(lbl.text));
   leftStatusSizer.add(lbl, 0, Align_Left);
   this.statusLabel = new Label(this);
   this.statusLabel.useRichText = true;
   this.statusLabel.text = '---';
   this.statusLabel.textAlignment = TextAlign_Left | TextAlign_VertCenter;
   leftStatusSizer.add(this.statusLabel, 1, Align_Left);
   this.progressLabel = new Label(this);
   this.progressLabel.text = '';
   middleStatusSizer.add(this.progressLabel, 0, Align_Center);
   lbl = new Label(this);
   lbl.textAlignment = TextAlign_Right | TextAlign_VertCenter;
   lbl.text = ' Found stars: ';
   rightStatusSizer.addStretch();
   rightStatusSizer.add(lbl, 0, Align_Right);
   this.foundStarsLabel = new Label(this);
   this.foundStarsLabel.text = '---';
   rightStatusSizer.add(this.foundStarsLabel, 0, Align_Right);
   this.statusSizer.add(leftStatusSizer, 1);
   this.statusSizer.add(middleStatusSizer, 1);
   this.statusSizer.add(rightStatusSizer, 1);

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
      //":/toolbar/image-display-value.png"
      ":/icons/windows.png"
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
      me.fixStars();
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
   this.updateUI();
   this.adjustToContents();
};

StarUtilsDialog.prototype = new Dialog;
function main() {
   jsAbortable = true;
   console.abortEnabled = true;
   var dialog = new StarUtilsDialog();
   dialog.restyle();
   do {
      var res = dialog.execute();
   } while (res);
}

main();
