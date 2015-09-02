var core = require('../core');

/**
 * The TimelineMovieClip class associates a TweenJS Timeline with an PIXI.Container.
 * @class
 * @extends PIXI.Container
 * @memberof PIXI.extras
 * @param {String} [mode=independent] Initial value for the mode property. One of "independent", "single", or "synched". The default is "independent".
 * @param {Number} [startPosition=0] Initial value for the startPosition property.
 * @param {Boolean} [loop=true] Initial value for the loop property. The default is true.
 * @param {Object} [labels=null] A hash of labels to pass to the timeline instance associated with this MovieClip.
 */
function TimelineMovieClip(mode, startPosition, loop, labels) {
    core.Container.call(this);

    /**
     * Controls how this MovieClip advances its time.
     * @property mode
     * @type {Number}
     * @default 0
     */
    this.mode = mode || 'independent';

    /**
     * @property startPosition
     * @type {Number}
     * @default 0
     */
    this.startPosition = startPosition || 0;

    /**
     * @property loop
     * @type {Boolean}
     * @default true
     */
    this.loop = this.loop === undefined || this.loop === null ? true : this.loop;

    /**
     * @property currentFrame
     * @type {Number}
     * @default 0
     */
    this.currentFrame = 0;

    /**
     * @property timeline
     * @type {Timeline}
     * @default null
     */
    this.timeline = new window.createjs.Timeline(null, labels, {
        loop: this.loop,
        paused: true,
        position: startPosition,
        useTicks: true
    });

    /**
     * If true, the MovieClip's position will not advance when ticked.
     * @property paused
     * @type Boolean
     * @default false
     */
    this.paused = false;

    /**
     * If true, actions in this MovieClip's tweens will be run when the playhead advances.
     * @property actionsEnabled
     * @type Boolean
     * @default true
     */
    this.actionsEnabled = true;

    /**
     * If true, the MovieClip will automatically be reset to its first frame whenever the timeline adds
     * it back onto the display list. This only applies to MovieClip instances with mode=INDEPENDENT.
     * <br><br>
     * For example, if you had a character animation with a "body" child MovieClip instance
     * with different costumes on each frame, you could set body.autoReset = false, so that
     * you can manually change the frame it is on, without worrying that it will be reset
     * automatically.
     * @property autoReset
     * @type Boolean
     * @default true
     */
    this.autoReset = true;

    /**
     * An array of bounds for each frame in the MovieClip. This is mainly intended for tool output.
     * @property frameBounds
     * @type Array
     * @default null
     */
    this.frameBounds = this.frameBounds||null; // TODO: Deprecated. This is for backwards support of FlashCC

    /**
     * By default MovieClip instances advance one frame per tick. Specifying a framerate for the MovieClip
     * will cause it to advance based on elapsed time between ticks as appropriate to maintain the target
     * framerate.
     *
     * For example, if a MovieClip with a framerate of 10 is placed on a Stage being updated at 40fps, then the MovieClip will
     * advance roughly one frame every 4 ticks. This will not be exact, because the time between each tick will
     * vary slightly between frames.
     *
     * This feature is dependent on the tick event object (or an object with an appropriate "delta" property) being
     * passed into {{#crossLink "Stage/update"}}{{/crossLink}}.
     * @property framerate
     * @type {Number}
     * @default null
     **/
    this.framerate = null;

    // private properties:
    /**
     * @property _synchOffset
     * @type Number
     * @default 0
     * @private
     */
    this._synchOffset = 0;

    /**
     * @property _prevPos
     * @type Number
     * @default -1
     * @private
     */
    this._prevPos = -1; // TODO: evaluate using a ._reset Boolean prop instead of -1.

    /**
     * @property _prevPosition
     * @type Number
     * @default 0
     * @private
     */
    this._prevPosition = 0;

    /**
     * The time remaining from the previous tick, only applicable when .framerate is set.
     * @property _t
     * @type Number
     * @private
     */
    this._t = 0;

    // add listener for tick event.
    window.createjs.Ticker.addEventListener('tick', this.advance.bind(this));
}
TimelineMovieClip.prototype = Object.create(core.Container.prototype);
TimelineMovieClip.prototype.constructor = TimelineMovieClip;
module.exports = TimelineMovieClip;

//
// constant
//
TimelineMovieClip.INDEPENDENT = 'independent';
TimelineMovieClip.SINGLE_FRAME = 'single';
TimelineMovieClip.SYNCHED = 'synched';

//
// getter setters
//
Object.defineProperties(TimelineMovieClip.prototype, {
    labels: {
        get: function() {
            return this.timeline.getLabels();
        }
    },
    currentLabel: {
        get: function() {
            this._updateTimeline();
            return this.timeline.getCurrentLabel();
        }
    },
    totalFrames: {
        get: function() {
            return this.timeline.duration;
        }
    },
    duration: {
        get: function() {
            return this.timeline.duration;
        }
    }
});

//
// public methods
//
/**
 * Constructor alias for backwards compatibility.
 * @method initialize
 **/
TimelineMovieClip.prototype.initialize = TimelineMovieClip;

/**
 * Returns true or false indicating whether the display object would be visible if drawn to a canvas.
 * @method isVisible
 * @return {Boolean} Boolean indicating whether the display object would be visible if drawn to a canvas
 **/
TimelineMovieClip.prototype.isVisible = function() {
    // children are placed in draw, so we can't determine if we have content.
    return !!(this.visible && this.alpha > 0 && this.scale.x !== 0 && this.scale.y !== 0);
};

/**
 * Sets paused to false.
 * @method play
 **/
TimelineMovieClip.prototype.play = function() {
    this.paused = false;
};

/**
 * Sets paused to true.
 * @method stop
 **/
TimelineMovieClip.prototype.stop = function() {
    this.paused = true;
};

/**
 * Advances this movie clip to the specified position or label and sets paused to false.
 * @method gotoAndPlay
 * @param {String|Number} positionOrLabel The animation name or frame number to go to.
 **/
TimelineMovieClip.prototype.gotoAndPlay = function(positionOrLabel) {
    this.paused = false;
    this._goto(positionOrLabel);
};

/**
 * Advances this movie clip to the specified position or label and sets paused to true.
 * @method gotoAndStop
 * @param {String|Number} positionOrLabel The animation or frame name to go to.
 **/
TimelineMovieClip.prototype.gotoAndStop = function(positionOrLabel) {
    this.paused = true;
    this._goto(positionOrLabel);
};

/**
 * Advances the playhead. This occurs automatically each tick by default.
 * @param [time] {Number} The amount of time in ms to advance by. Only applicable if framerate is set.
 * @method advance
 */
TimelineMovieClip.prototype.advance = function(time) {
    // TODO: should we worry at all about clips who change their own modes via frame scripts?
    var independent = TimelineMovieClip.INDEPENDENT;
    if (this.mode !== independent) {
        return;
    }

    var o = this, fps = o.framerate;
    while ((o = o.parent) && (fps === null || fps === undefined)) {
        if (o.mode === independent) {
            fps = o._framerate;
        }
    }
    this._framerate = fps;

    var t = (fps !== null && fps !== undefined && fps !== -1 && time !== null && time !== undefined) ? time / (1000 / fps) + this._t : 1;
    var frames = t || 0;
    this._t = t - frames; // leftover time

    while (!this.paused && frames--) {
        this._prevPosition = (this._prevPos < 0) ? 0 : this._prevPosition+1;
        this._updateTimeline();
    }
};

//
// private methods
//
/**
 * @method _tick
 * @param {Object} evtObj An event object that will be dispatched to all tick listeners. This object is reused between dispatchers to reduce construction & GC costs.
 * function.
 * @protected
 **/
TimelineMovieClip.prototype._tick = function(evtObj) {
    this.advance(evtObj && evtObj.delta);
};
/**
 * @method _goto
 * @param {String|Number} positionOrLabel The animation name or frame number to go to.
 * @protected
 **/
TimelineMovieClip.prototype._goto = function(positionOrLabel) {
    var pos = this.timeline.resolve(positionOrLabel);
    if (pos === undefined || pos === null) {
        return;
    }
    if (this._prevPos === -1) {
      this._prevPos = NaN;
    }
    this._prevPosition = pos;
    this._t = 0;
    this._updateTimeline();
};

/**
 * @method _updateTimeline
 * @protected
 **/
TimelineMovieClip.prototype._updateTimeline = function() {
    var tl = this.timeline;
    var synched = this.mode !== TimelineMovieClip.INDEPENDENT;
    tl.loop = this.loop === undefined || this.loop === null ? true : this.loop;
    var pos = synched ? this.startPosition + (this.mode === TimelineMovieClip.SINGLE_FRAME ? 0:this._synchOffset) : (this._prevPos < 0 ? 0 : this._prevPosition);
    var mode = synched || !this.actionsEnabled ? window.createjs.Tween.NONE : null;

    this.currentFrame = tl._calcPosition(pos);

    tl.setPosition(pos, mode);

    this._prevPosition = tl._prevPosition;
    if (this._prevPos === tl._prevPos) {
        return;
    }
    this.currentFrame = this._prevPos = tl._prevPos;
};
