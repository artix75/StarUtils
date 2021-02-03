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

#include "StarUtils-GUI.js"

#feature-id Utilities > StarUtils
#feature-info StarUtils is a PixInsight script that can be used to analyze \
    stars, create masks from them and, finally, to fix them. \
    Star fixing mainly consists of two separate processes that can also be \
    selectively enabled or disabled: \
    <b>elongation fix</b> and <b>star reduction</b>.<br>\
    \
    Copyright &copy; 2020-2025 Giuseppe Fabio Nicotra (artix2 at gmail dot com)

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
