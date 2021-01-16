# StarUtils - A PixInsight® script for star analysis and fixing

StarUtils is a [PixInsight®](https://pixinsight.com/) (a popular astrophotography processing software) script that can be used to analyze stars, create masks from them and, finally, to fix them.
Star fixing mainly consists of two separate process that can also be selectively enabled or disabled: **elongation fix** and **star reduction**.

Under the hood, StarUtils uses PixInsight's StarDetector class in order to detect stars inside the image and then it tries to find a valid **PSF solution** for stars matching various tunable parameters by using [DynamicPSF process](https://pixinsight.com/doc/tools/DynamicPSF/DynamicPSF.html).

PSF Solution is used to calculate star's elongation determined by either coma or bad mount tracking.

After detection, StarUtils allows to analyze different features of the detected stars (size, flux, elongation (*aspect ratio* and *angle*), and statistics about them.
Users can then recaclulate PSF, select or deselect stars and generate masks or try to fix those stas.

## Launching the script

Just execute the *StarUtils-main.js* script from PixInsight's *Script->Execute Script File...* menu.

## Adding the script to PixInsight's scripts

Go to *Script->Feature Scripts...* PixInsight's menu, then click **Add** button. For more info, take a look at [this tutorial](https://pixinsight.com.ar/index.php?s=documentos_detalle&doc_id=2&key=add-script&i=2#:~:text=In%20the%20Feature%20Scripts%20dialog,in%20PixInsight%20%3E%20src%20%3E%20scripts.).

## Target Image

**IMPORTANT**: it's recommended to use the script on *star-only* images, in order to obtain better results. It's strongly suggested to use the **StarNet** PixInsight's process in order to separate the stars from the source image.
**StarNet** is available since PixInsight version *1.8.8-6*. For earlier versions, a module version of **StarNet** is also [available](https://pixinsight.com/forum/index.php?threads/starnet-new-module-for-star-removal.13171/).

## Using StarUtils

### Star Detection

After launch, the script's dialog will propose various parameters that will be used to detect stars and find a *PSF solution*.
By default, the target image will be the current active image in PixInsight. Anyway, you're free to select any other image. By enbaling the *Target Area* checkbox, you'll be able to define a **target area** by using image's *previews*.
In this case, only stars inside the selcted target area will be used for both *PSF solution* and *fixing*.

In order to start detection, just click the **Detect Stars** button.

### Star analysis and statistics

After detection, the dialog window will expand, showing a preview of the image itself (with detected stars marked by a blue box), a list of all the detected stars with all their features (width, flux, aspect ratio, angle and so on...) and, on the right of the window, various parameters for **mask generation** and **fixing**.
On the bottom you'll have various buttons for all the different actions (**mask creation**, **fixing**, **statistics**).
You can always **reset** and start detection again (even on a different image/target area) by simply clicking the **reset** button.

### Using the star list and the preview image

The star list will list all the detected stars. Each star will be identified by an **ID** that is something like *s1*,*s2*, and so on, where the number depends on the detection order.
Every star will display it's width (in pixel), flux, aspect ratio and angle. Width refers to the side of the box detected around the star itself by **StarDetector**. Aspect ratio and angle will **only be available for stars having a PSF solution**. You can increase the number of stars with a PSF soluton by changing the PSF parameters. The PSF soluton can be recalculated by clicking on the **Calculate PSF** button without the need to reset the current window.
Aspect ratio is the ratio between PSF width and PSF height. So a perfect rounded star will ideally have an aspect ratio of 1.0. The lower the aspect ratio, the higher is the star elongation.
**Warning:** be aware that sometimes two or more stars could be detected as a single star by **DynamicPSF**, and this can result in a wrong aspect ratio and angle and, consequently, in a bad *elongation fix*.
By overing mouse on every star, a tooltip will appear with further info.
You can select/deselect multiple stars. Double click on a single star in order to zoom it in the **preview image**.

The preview image will display the target image. All detected stars will be marked by a blue box. You can toggle those marks by using the appopriate toggler button above the preview itself.
Selected stars will be marked by a green box. You can select/deselect stars either by clicking on them in the star list or on the preview image itself.
Inside every marking box you'll also find a PSF ellipse for those stars having a PSF solution. The ellipse will visually display the aspect ratio (elongation) and the angle of the star. A crosshair will also display PSF center.

### Visualizing statistics

Click on **Stats** button on the bottom of the window in order to open the **Statistics Window**.
In the statistics window you can inspect various statistical data (mean, median, standard deviation, and so on) about different features of the detected stars (width, flux, aspect ratio).
The window will also show a chart about the selected feature and its distribution.

### Recalculating PSF

You can calculate the PSF solution for stars missing it by clicking on the **Calculate PSF** button.
A window will allow you to change thresholds in roder to include more stars in the PSF calculation. **Remember** that only star with a PSF soliution will be fixed for their **elongation**.

### Generating masks

On the right of the main window you'll find a box containing the parameters of mask generation (**Mask Creation**).
You have three options:

- *Selected stars*: generate a mask containing only the selected stars (stars can be selected both on the star list and on the preview image).
- *Undetected stars*: generate a mask containing only stars that were not detected by star detection.
- *Custom*: generate a mask containing only stars matching the *width* and *flux* threshold that can be set by using the specific sliders inside the **Mask Creation** box.

Just click the **Create Mask** button in order to generate a mask image with the selected parameters.

### Fixing stars

The star fixing process is composed by two independant processes: **Fix Elongation** and **Reduce Stars**.

- *Fix Elongation* will try to fix elongation on stars having a PSF solution. The fix will try to make those stars more rounded. You can disable the elongation fix by disabling the **Fix Elongation** checkbox. You can also control some parameters:
    - *Threshold*: this is the apsect ratio threshold, meaning that only stars having a lower aspect ratio than the selected threshold will be fixed. By default is 0.9. Rememeber that the lower the aspect ratio, the higher is the star distortion (elongation) and that a perfect rounded star has an aspect ratio of 1.0.
    - *Fix Factor*: by default is 1.0. Use a lower value if you find that the fix is too eccessive (ie. elongating the star in the opposite direction).
    - *Only fix selected stars*: enable this checkbox if you want to apply the fix only on the selected stars (stars can be selected both on the star list and on the preview image),
    - *Keep Mask*: also generate an image mask containing the fixed stars. It can be useful to further process those stars in the future.
- *Reduce Stars*: star (size) reduction is achieved using **MorphologicalTransformation** PixInsight's process. You can disable the star reduction by disabling the **Reduce Stars** checkbox. You can choose the amount of reduction by tuning the *Morphological Selection* slider inside the box.

In order to start the fixing process, just click the **Fix Stars** button on the bottom of the window. The fixing process will execute, in order, the elongation fix (if enabled) and the star reduction (if enabled).


## Development status

StarUtils is currently in alpha development status.
