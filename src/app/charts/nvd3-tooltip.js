/**!
 *
 *  Copyright 2016 Netflix, Inc.
 *
 *     Licensed under the Apache License, Version 2.0 (the "License");
 *     you may not use this file except in compliance with the License.
 *     You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *     Unless required by applicable law or agreed to in writing, software
 *     distributed under the License is distributed on an "AS IS" BASIS,
 *     WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *     See the License for the specific language governing permissions and
 *     limitations under the License.
 *
 */

/*global d3*/
/*global nv*/
/*global document*/

nv.models.tooltip = function () {

    'use strict';

    var id = 'nvtooltip-' + Math.floor(Math.random() * 100000), // Generatooltip() object.
        data = null,
        gravity = 'w',   // Can be 'n','s','e','w'. Determines how tooltip is positioned.
        distance = 25, // Distance to offset tooltip from the mouse location.
        snapDistance = 0,   // Tolerance a
    // fixedTop = null, // If not null, this fixes the top position of the tooltip.
        classes = null,  // Attaches additional CSS classes to the tooltip DIV that is created.
        chartContainer = null, // Parent dom element of the SVG that holds the chart.
        hidden = true,  // Start off hidden, toggle with hide/show functions below.
        hideDelay = 200,  // Delay (in ms) before the tooltip hides after calling hide().
        tooltip = null, // d3 select of the tooltip div.
        lastPosition = {left: null, top: null}, // Last position the tooltip was in.
        enabled = true,  // True -> tooltips are rendered. False -> don't render tooltips.
        duration = 100, // Tooltip movement duration, in ms.
        headerEnabled = true, // If is to show the tooltip header.
        nvPointerEventsClass = 'nv-pointer-events-none'; // CSS class to specify whether element should not have
    var position = function () {
        return {
            left: d3.event.clientX,
            top: d3.event.clientY
        };
    };

    // Format function for the tooltip values column.
    var valueFormatter = function (d) {
        return d;
    };

    // Format function for the tooltip header value.
    var headerFormatter = function (d) {
        return d;
    };

    var keyFormatter = function (d) {
        return d;
    };

    // By default, the tooltip model renders a beautiful table inside a DIV.
    // You can override this function if a custom tooltip is desired.
    var contentGenerator = function (d) {
        if (d === null) {
            return '';
        }

        var table = d3.select(document.createElement('table'));
        if (headerEnabled) {
            var theadEnter = table.selectAll('thead')
                .data([d])
                .enter().append('thead');

            theadEnter.append('tr')
                .append('td')
                .attr('colspan', 3)
                .append('strong')
                .classed('x-value', true)
                .html(headerFormatter(d.value));
        }

        var tbodyEnter = table.selectAll('tbody')
            .data([d])
            .enter().append('tbody');

        var trowEnter = tbodyEnter.selectAll('tr')
            .data(function (p) {
                return p.series;
            })
            .enter()
            .append('tr')
            .classed('highlight', function (p) {
                return p.highlight;
            });

        trowEnter.append('td')
            .classed('legend-color-guide', true)
            .append('div')
            .style('background-color', function (p) {
                return p.color;
            });

        trowEnter.append('td')
            .classed('key', true)
            .classed('total', function (p) {
                return !!p.total;
            })
            .html(function (p, i) {
                return keyFormatter(p.key, i);
            });

        trowEnter.append('td')
            .classed('value', true)
            .html(function (p, i) {
                return valueFormatter(p.value, i);
            });

        trowEnter.selectAll('td').each(function (p) {
            if (p.highlight) {
                var opacityScale = d3.scale.linear().domain([0, 1]).range(['#fff', p.color]);
                var opacity = 0.6;
                d3.select(this)
                    .style('border-bottom-color', opacityScale(opacity))
                    .style('border-top-color', opacityScale(opacity))
                ;
            }
        });

        var html = table.node().outerHTML;
        if (d.footer !== undefined) {
            html += '<div class="footer">' + d.footer + '</div>';
        }
        return html;

    };

    var dataSeriesExists = function (d) {
        if (d && d.series) {
            if (d.series instanceof Array) {
                return !!d.series.length;
            }
            // if object, it's okay just convert to array of the object
            if (d.series instanceof Object) {
                d.series = [d.series];
                return true;
            }
        }
        return false;
    };

    // Calculates the gravity offset of the tooltip. Parameter is position of tooltip
    // relative to the viewport.
    var calcGravityOffset = function (pos) {
        var height = tooltip.node().offsetHeight,
            width = tooltip.node().offsetWidth,
            clientWidth = document.documentElement.clientWidth, // Don't want scrollbars.
            clientHeight = document.documentElement.clientHeight, // Don't want scrollbars.
            left, top, tmp;

        // calculate position based on gravity
        switch (gravity) {
            case 'e':
                left = -width - distance;
                top = -(height / 2);
                if (pos.left + left < 0) {
                    left = distance;
                }
                if ((tmp = pos.top + top) < 0) {
                    top -= tmp;
                }
                if ((tmp = pos.top + top + height) > clientHeight) {
                    top -= tmp - clientHeight;
                }
                break;
            case 'w':
                left = distance;
                top = -(height / 2);
                if (pos.left + left + width > clientWidth) {
                    left = -width - distance;
                }
                if ((tmp = pos.top + top) < 0) {
                    top -= tmp;
                }
                if ((tmp = pos.top + top + height) > clientHeight) {
                    top -= tmp - clientHeight;
                }
                break;
            case 'n':
                left = -(width / 2) - 5; // - 5 is an approximation of the mouse's height.
                top = distance;
                if (pos.top + top + height > clientHeight) {
                    top = -height - distance;
                }
                if ((tmp = pos.left + left) < 0) {
                    left -= tmp;
                }
                if ((tmp = pos.left + left + width) > clientWidth) {
                    left -= tmp - clientWidth;
                }
                break;
            case 's':
                left = -(width / 2);
                top = -height - distance;
                if (pos.top + top < 0) {
                    top = distance;
                }
                if ((tmp = pos.left + left) < 0) {
                    left -= tmp;
                }
                if ((tmp = pos.left + left + width) > clientWidth) {
                    left -= tmp - clientWidth;
                }
                break;
            case 'center':
                left = -(width / 2);
                top = -(height / 2);
                break;
            default:
                left = 0;
                top = 0;
                break;
        }

        return {'left': left, 'top': top};
    };

    /*
     Positions the tooltip in the correct place, as given by the position() function.
     */
    var positionTooltip = function () {
        nv.dom.read(function () {
            var pos = position(),
                gravityOffset = calcGravityOffset(pos),
                left = pos.left + gravityOffset.left,
                top = pos.top + gravityOffset.top;

            // delay hiding a bit to avoid flickering
            if (hidden) {
                tooltip
                    .interrupt()
                    .transition()
                    .delay(hideDelay)
                    .duration(0)
                    .style('opacity', 0);
            } else {
                // using tooltip.style('transform') returns values un-usable for tween
                var oldTranslate = 'translate(' + lastPosition.left + 'px, ' + lastPosition.top + 'px)';
                var newTranslate = 'translate(' + left + 'px, ' + top + 'px)';
                var translateInterpolator = d3.interpolateString(oldTranslate, newTranslate);
                var isHidden = tooltip.style('opacity') < 0.1;

                tooltip
                    .interrupt() // cancel running transitions
                    .transition()
                    .duration(isHidden ? 0 : duration)
                    // using tween since some versions of d3 can't auto-tween a translate on a div
                    .styleTween('transform', function () {
                        return translateInterpolator;
                    }, 'important')
                    // Safari has its own `-webkit-transform` and does not support `transform`
                    .styleTween('-webkit-transform', function () {
                        return translateInterpolator;
                    })
                    .style('-ms-transform', newTranslate)
                    .style('opacity', 1);
            }

            lastPosition.left = left;
            lastPosition.top = top;
        });
    };

    // Creates new tooltip container, or uses existing one on DOM.
    function initTooltip() {
        if (!tooltip) {

            var container = document.body;

            // Create new tooltip div if it doesn't exist on DOM.
            tooltip = d3.select(container).append('div')
                .attr('class', 'nvtooltip ' + (classes ? classes : 'xy-tooltip'))
                .attr('id', id);
            tooltip.style('top', 0).style('left', 0);
            tooltip.style('opacity', 0);
            tooltip.style('position', 'fixed');
            tooltip.selectAll('div, table, td, tr').classed(nvPointerEventsClass, true);
            tooltip.classed(nvPointerEventsClass, true);
        }
    }

    // Draw the tooltip onto the DOM.
    function nvtooltip() {
        if (!enabled) {
            return;
        }
        if (!dataSeriesExists(data)) {
            return;
        }

        nv.dom.write(function () {
            initTooltip();
            // Generate data and set it into tooltip.
            // Bonus - If you override contentGenerator and return falsey you can use something like
            //         React or Knockout to bind the data for your tooltip.
            var newContent = contentGenerator(data);
            if (newContent) {
                tooltip.node().innerHTML = newContent;
            }

            positionTooltip();
        });

        return nvtooltip;
    }

    nvtooltip.nvPointerEventsClass = nvPointerEventsClass;
    nvtooltip.options = nv.utils.optionsFunc.bind(nvtooltip);

    nvtooltip._options = Object.create({}, {
        // simple read/write options
        duration: {
            get: function () {
                return duration;
            }, set: function (_) {
                duration = _;
            }
        },
        gravity: {
            get: function () {
                return gravity;
            }, set: function (_) {
                gravity = _;
            }
        },
        distance: {
            get: function () {
                return distance;
            }, set: function (_) {
                distance = _;
            }
        },
        snapDistance: {
            get: function () {
                return snapDistance;
            }, set: function (_) {
                snapDistance = _;
            }
        },
        classes: {
            get: function () {
                return classes;
            }, set: function (_) {
                classes = _;
            }
        },
        chartContainer: {
            get: function () {
                return chartContainer;
            }, set: function (_) {
                chartContainer = _;
            }
        },
        enabled: {
            get: function () {
                return enabled;
            }, set: function (_) {
                enabled = _;
            }
        },
        hideDelay: {
            get: function () {
                return hideDelay;
            }, set: function (_) {
                hideDelay = _;
            }
        },
        contentGenerator: {
            get: function () {
                return contentGenerator;
            }, set: function (_) {
                contentGenerator = _;
            }
        },
        valueFormatter: {
            get: function () {
                return valueFormatter;
            }, set: function (_) {
                valueFormatter = _;
            }
        },
        headerFormatter: {
            get: function () {
                return headerFormatter;
            }, set: function (_) {
                headerFormatter = _;
            }
        },
        keyFormatter: {
            get: function () {
                return keyFormatter;
            }, set: function (_) {
                keyFormatter = _;
            }
        },
        headerEnabled: {
            get: function () {
                return headerEnabled;
            }, set: function (_) {
                headerEnabled = _;
            }
        },
        position: {
            get: function () {
                return position;
            }, set: function (_) {
                position = _;
            }
        },

        // options with extra logic
        hidden: {
            get: function () {
                return hidden;
            }, set: function (_) {
                if (hidden !== _) {
                    hidden = !!_;
                    nvtooltip();
                }
            }
        },
        data: {
            get: function () {
                return data;
            }, set: function (_) {
                // if showing a single data point, adjust data format with that
                if (_.point) {
                    _.value = _.point.x;
                    _.series = _.series || {};
                    _.series.value = _.point.y;
                    _.series.color = _.point.color || _.series.color;
                }
                data = _;
            }
        },

        // read only properties
        node: {
            get: function () {
                return tooltip.node();
            }, set: function () {
            }
        },
        id: {
            get: function () {
                return id;
            }, set: function () {
            }
        }
    });

    nv.utils.initOptions(nvtooltip);
    return nvtooltip;
};
