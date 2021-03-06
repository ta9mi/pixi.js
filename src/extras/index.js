/**
 * @file        Main export of the PIXI extras library
 * @author      Mat Groves <mat@goodboydigital.com>
 * @copyright   2013-2015 GoodBoyDigital
 * @license     {@link https://github.com/GoodBoyDigital/pixi.js/blob/master/LICENSE|MIT License}
 */

require('./cacheAsBitmap');
require('./getChildByName');
require('./getGlobalPosition');

/**
 * @namespace PIXI.extras
 */
module.exports = {
    MovieClip:          require('./MovieClip'),
    TimelineMovieClip:  require('./TimelineMovieClip'),
    TilingSprite:       require('./TilingSprite'),
    BitmapText:         require('./BitmapText')
};
