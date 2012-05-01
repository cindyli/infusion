/*
Copyright 2009 University of Toronto
Copyright 2011 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global fluid_1_5:true, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

var fluid_1_5 = fluid_1_5 || {};

(function ($, fluid) {

    /****************
     * AfA Store *
     ****************/
     
    /**
     * SettingsStore Subcomponent that uses the GPII Preferences server for persistence, and handles
     * the GPII Access for All settings format.
     */
    fluid.defaults("fluid.afaStore", {
        gradeNames: ["fluid.uiOptions.store", "autoInit"],
        invokers: {
            fetch: {
                funcName: "fluid.afaStore.fetch",
                args: ["{afaStore}"]
            },
            save: {
                funcName: "fluid.afaStore.save",
                args: ["{arguments}.0", "{afaStore}"]
            },
            AfAtoUIO: {
                funcName: "fluid.afaStore.AfAtoUIO",
                args: ["{arguments}.0", "{afaStore}"]
            },
            UIOtoAfA: {
                funcName: "fluid.afaStore.UIOtoAfA",
                args: ["{arguments}.0", "{afaStore}"]
            }
        },
        events: {
            rulesReady: null
        },
        prefsServerURL: "http://localhost:8080/store/",
        userToken: "123"
    });

    fluid.afaStore.getServerURL = function (prefsServerURL, userToken) {
        return prefsServerURL + userToken;
    };
    
    fluid.afaStore.fetch = function (that) {
        $.get(fluid.afaStore.getServerURL(that.options.prefsServerURL, that.options.userToken), function (data) {
            that.events.settingsReady.fire($.extend(true, {}, that.options.defaultSiteSettings, that.AfAtoUIO(data)));
        });
    };

    fluid.afaStore.save = function (settings, that) {
        $.ajax({
            url: fluid.afaStore.getServerURL(that.options.prefsServerURL, that.options.userToken),
            type: "POST",
            data: JSON.stringify(that.UIOtoAfA(settings)),
            headers: {
                "Accept": "application/json",
                "Content-type": "application/json"
            }
        });
    };

    fluid.afaStore.AfAtoUIO = function (settings, that) {
        // Save the original AfA settings in order to preserve UIO unsupported AfA preferences
        that.originalAfAPrefs = fluid.copy(settings);
        
        return fluid.model.transformWithRules(settings, [
            fluid.afaStore.AfAtoUIOScreenEnhanceRules,
            fluid.afaStore.AfAtoUIOAdaptPrefRules,
            fluid.afaStore.AfAtoUIOrules
        ]);
    };
    
    fluid.afaStore.UIOtoAfA = function (settings, that) {
        var UIOTransformedSettings = fluid.model.transformWithRules(settings, [
            fluid.afaStore.UIOtoAfArules,
            fluid.afaStore.UIOtoAfAUIOApprules
        ]);
        
        // Preserve the AfA preferences that are not UIO supported
        if (that.originalAfAPrefs) {
            var target = fluid.copy(that.originalAfAPrefs);

            // Remove the original AfA preferences that are supposed to be transformed from UIO
            // so that the empty AfA settings won't re-filled by the original ones.
            fluid.each(fluid.afaStore.UIOtoAfArules, function (value, key) {
                if (fluid.get(target, key)) {
                    var segs = key.split("."),
                        thisKey = segs.pop();
                    
//                    if (isNaN(parseInt(thisKey))) {
                        // delete an object
                        delete fluid.get(target, segs.join("."))[thisKey];
//                    } else {
//                        // delete array element
//                        fluid.get(target, segs.join(".")).splice(parseInt(thisKey), 1);
//                    }
                }
            });
            
            fluid.merge({
//                "content.adaptationPreference": fluid.afaStore.mergeArray,
                "display.screenEnhancement.applications": fluid.afaStore.mergeApps
            }, target, UIOTransformedSettings);
            return target;
        } else {
//            return fluid.merge({
//                "content.adaptationPreference": fluid.afaStore.mergeArray,
//                "display.screenEnhancement.applications": fluid.afaStore.mergeApps
//            }, {}, UIOTransformedSettings);
            return UIOTransformedSettings;
        }
    };
    
    
//    fluid.afaStore.mergeArray = function (target, source) {
//        target = target || [];
//        
//        fluid.each(source, function (oneSource) {
//            target.push(oneSource);
//        });
//        return target;
//    };
    
    fluid.afaStore.mergeApps = function (target, source) {
        target = target || [];
        
        var sourceID = source[0].id;
        
        var sourceIndex = fluid.find(target, function (app, index) {
            if (app.id === sourceID) {
                return index;
            }
        });
        
        if (!sourceIndex && sourceIndex !== 0) {
            target.push(source[0]);
            return target;
        }
        
        target[sourceIndex] = source[0];
        return target;
    };

    /**********************************************
     * Model Transformers
     **********************************************/
    fluid.registerNamespace("fluid.afaStore.transform");

    /**
     * convert a string value into one of several possible path-value pairs.
     * 'valueMap' maps the string value to the path/value.
     * Note that the value may be an object.
     * NOTE: This does not yet handle recursion or special cases
     */
    fluid.afaStore.transform.valueMapper = function (model, expandSpec, recurse) {
        var val = fluid.get(model, expandSpec.path);
        
        if (typeof val !== "undefined") {
            return expandSpec.valueMap[val];
        }
    };
    
    /**
     * Produce a caption AfA adaptationPreference object.
     * This transformer assumes knowledge of the "language" path in the source model.
     */
    fluid.afaStore.transform.afaCaption = function (model, expandSpec, recurse) {
        var cap = fluid.get(model, expandSpec.path);
        if (!cap) {
            return {};
        }
        return {
            adaptationType: "caption",
            language: fluid.get(model, "language")
        };
    };

    /**
     * Produce a transcript AfA adaptationPreference object.
     * This transformer assumes knowledge of the "language" path in the source model.
     */
    fluid.afaStore.transform.afaTranscript = function (model, expandSpec, recurse) {
        var tran = fluid.get(model, expandSpec.path);
        if (!tran) {
            return {};
        }
        return {
            representationForm: ["transcript"],
            language: fluid.get(model, "language")
        };
    };
    
    /**
     * Intermediate process: flatten the array of adaptationPreferences
     */
    fluid.afaStore.transform.flattenAdaptPrefs = function (model, expandSpec, recurse) {
        var adaptPrefs = fluid.get(model, expandSpec.path);
        if (!adaptPrefs) {
            return {};
        }
        var result = {};
        fluid.each(adaptPrefs, function (value, key) {
            if (value.adaptationType === "caption" && !result.captions) {
                result.captions = true;
                result.language = value.language;
            } else if (value.representationForm && $.inArray("transcript", value.representationForm) !== -1) {
                result.transcripts = true;
                if (!result.language) {
                    result.language = value.language;
                }
            }
        });
        return result;
    };
    
    /**
     * Intermediate process: remove the screenEnhancement applications that are not UIO specific
     */
    fluid.afaStore.transform.simplifyScreenEnhance = function (model, expandSpec, recurse) {
        var val = fluid.get(model, expandSpec.path);
        if (!val) {
            return {};
        }
        if (val.applications) {
            var apps = val.applications;
            var resultApps = [];
    
            for (var i in apps) {
                var oneApp = apps[i];
                if (oneApp.name === "UI Options" && oneApp.id === "fluid.uiOptions") {
                    resultApps.push(oneApp);
                    break;
                }
            }
            
            if (resultApps.length > 0) {
                val.applications = resultApps;  // UIO application is the only element in "applications" array
            } else {
                delete val.applications;  // get rid of "applications" element if no UIO specific settings
            }
        }
        return val;
    };
    
    var baseDocumentFontSize = function () {
        return parseFloat($("html").css("font-size")); // will be the float # of pixels
    };

    /**
     * 
     */
    fluid.afaStore.transform.fontFactor = function (model, expandSpec, recurse) {
        var val = fluid.get(model, expandSpec.path);
        if (!val) {
            return {};
        }

        return Math.round(parseFloat(val / baseDocumentFontSize()) * 10) / 10;
    };

    /**
     * 
     */
    fluid.afaStore.transform.fontSize = function (model, expandSpec, recurse) {
        var val = fluid.get(model, expandSpec.path);
        if (!val) {
            return {};
        }

        return baseDocumentFontSize() * val;
    };

    var colourTable = {
        white: {
            black: "wb"
        },
        yellow: {
            black: "yb"
        },
        black: {
            white: "bw",
            yellow: "by"
        }
    };
    /**
     * Convert a foreground/background colour combination into a theme name.
     * Assumptions: If one of the colours is not specified, we cannot identify a theme.
     */
    fluid.afaStore.transform.coloursToTheme = function (model, expandSpec, recurse) {
        var fg = fluid.get(model, expandSpec.fgpath);
        var bg = fluid.get(model, expandSpec.bgpath);
        if (colourTable[fg]) {
            return colourTable[fg][bg];
        }
    };
    
    /**
     * Convert a foreground/background colour combination into a theme name.
     * Assumptions: If one of the colours is not specified, we cannot identify a theme.
     */
    fluid.afaStore.transform.strToNum = function (model, expandSpec, recurse) {
        var val = fluid.get(model, expandSpec.path);
        if (typeof (val) !== "undefined") {
            return parseFloat(val);
        }
    };
    
    /**
     * Convert AfA-unsupported UIO settings into AfA preference string.
     */
    fluid.afaStore.transform.afaUnSupportedUIOSettings = function (model, expandSpec, recurse) {
        var val = fluid.get(model, expandSpec.path);
        if (!val && val !== false) {
            return;
        }
        
        return typeof val === "number" ? val.toString() : val;
    };
    
    /**
     * Complete the node for preserving AfA-unsupported UIO settings
     */
    fluid.afaStore.transform.fleshOutUIOSettings = function (model, expandSpec, recurse) {
        var fullVal = fluid.get(model, expandSpec.path);
        var val = fluid.get(fullVal, "screenEnhancement.applications.0.parameters");
        if (!val) {
            return fullVal;
        }
        
        fullVal.screenEnhancement.applications[0].name = "UI Options";
        fullVal.screenEnhancement.applications[0].id = "fluid.uiOptions";
        
        return fullVal;
    };

    fluid.afaStore.transform.createAppsArray = function (model, expandSpec) {
//        fluid.set(model, "display.screenEnhancement.applications", []);
        return [];
    };
    
    /**********************************************
     * Transformation Rules
     **********************************************/

    fluid.afaStore.AfAtoUIOrules = {
        "textFont": {
            "expander": {
                "type": "fluid.afaStore.transform.valueMapper",
                "path": "display.screenEnhancement.fontFace.genericFontFace",
                "_comment": "TODO: For now, this ignores the actual 'fontName' setting",
                "valueMap": {
                    "serif": "times",
                    "sans serif": "verdana",
                    "monospaced": "default",
                    "fantasy": "default",
                    "cursive": "default"
                }
            }
        },
        "textSize": {
            "expander": {
                "type": "fluid.afaStore.transform.fontFactor",
                "path": "display.screenEnhancement.fontSize"
            }
        },
        "toc": {
            "expander": {
                "type": "fluid.model.transform.value",
                "path": "control.structuralNavigation.tableOfContents"
            }
        },
        "captions": {
            "expander": {
                "type": "fluid.model.transform.value",
                "path": "flatAdaptationPreferences.captions"
            }
        },
        "transcripts": {
            "expander": {
                "type": "fluid.model.transform.value",
                "path": "flatAdaptationPreferences.transcripts"
            }
        },
        "language": {
            "expander": {
                "type": "fluid.model.transform.value",
                "path": "flatAdaptationPreferences.language"
            }
        },
        "theme": {
            "expander": {
                "type": "fluid.afaStore.transform.coloursToTheme",
                "fgpath": "display.screenEnhancement.foregroundColor",
                "bgpath": "display.screenEnhancement.backgroundColor"
            }
        },
        "lineSpacing": {
            "expander": {
                "type": "fluid.afaStore.transform.strToNum",
                "path": "display.screenEnhancement.applications.0.parameters.lineSpacing"
            }
        },
        "links": "display.screenEnhancement.applications.0.parameters.links",
        "inputsLarger": "display.screenEnhancement.applications.0.parameters.inputsLarger",
        "layout": "display.screenEnhancement.applications.0.parameters.layout",
        "volume": {
            "expander": {
                "type": "fluid.afaStore.transform.strToNum",
                "path": "display.screenEnhancement.applications.0.parameters.volume"
            }
        }
    };

    fluid.afaStore.AfAtoUIOAdaptPrefRules = {
        "flatAdaptationPreferences": {
            "expander": {
                "type": "fluid.afaStore.transform.flattenAdaptPrefs",
                "path": "content.adaptationPreference"
            }
        },
        "display": "display",
        "control": "control"
    };

    fluid.afaStore.AfAtoUIOScreenEnhanceRules = {
        "display.screenEnhancement": {
            "expander": {
                "type": "fluid.afaStore.transform.simplifyScreenEnhance",
                "path": "display.screenEnhancement"
            }
        },
        "content": "content",
        "control": "control"
    };

    fluid.afaStore.UIOtoAfArules = {
        "display.screenEnhancement.fontFace": {
            "expander": {
                "type": "fluid.afaStore.transform.valueMapper",
                "path": "textFont",
                "valueMap": {
                    "times": {
                        "fontName": ["Times New Roman"],
                        "genericFontFace": "serif"
                    },
                    "verdana": {
                        "fontName": ["Verdana"],
                        "genericFontFace": "sans serif"
                    },
                    "arial": {
                        "fontName": ["Arial"],
                        "genericFontFace": "sans serif"
                    },
                    "comic": {
                        "fontName": ["Comic Sans"],
                        "genericFontFace": "sans serif"
                    }
                }
            }
        },
        "display.screenEnhancement.fontSize": {
            "expander": {
                "type": "fluid.afaStore.transform.fontSize",
                "path": "textSize"
            }
        },
        "control.structuralNavigation.tableOfContents": {
            "expander": {
                "type": "fluid.model.transform.value",
                "path": "toc"
            }
        },
        "_comment": "NB: This will always place transcripts second in the array, even if there are no captions",
        "content.adaptationPreference.1": {
            "expander": {
                "type": "fluid.afaStore.transform.afaTranscript",
                "path": "transcripts"
            }
        },
        "content.adaptationPreference.0": {
            "expander": {
                "type": "fluid.afaStore.transform.afaCaption",
                "path": "captions"
            }
        },
        "display.screenEnhancement.foregroundColor": {
            "expander": {
                "type": "fluid.afaStore.transform.valueMapper",
                "path": "theme",
                "valueMap": {
                    "yb": "yellow",
                    "by": "black",
                    "wb": "white",
                    "bw": "black"
                }
            }
        },
        "display.screenEnhancement.backgroundColor": {
            "expander": {
                "type": "fluid.afaStore.transform.valueMapper",
                "path": "theme",
                "valueMap": {
                    "yb": "black",
                    "by": "yellow",
                    "wb": "black",
                    "bw": "white"
                }
            }
        },
        "display.screenEnhancement.applications.0.parameters.lineSpacing": {
            "expander": {
                "type": "fluid.afaStore.transform.afaUnSupportedUIOSettings",
                "path": "lineSpacing"
            }
        },
        "display.screenEnhancement.applications.0.parameters.links": {
            "expander": {
                "type": "fluid.afaStore.transform.afaUnSupportedUIOSettings",
                "path": "links"
            }
        },
        "display.screenEnhancement.applications.0.parameters.inputsLarger": {
            "expander": {
                "type": "fluid.afaStore.transform.afaUnSupportedUIOSettings",
                "path": "inputsLarger"
            }
        },
        "display.screenEnhancement.applications.0.parameters.layout": {
            "expander": {
                "type": "fluid.afaStore.transform.afaUnSupportedUIOSettings",
                "path": "layout"
            }
        },
        "display.screenEnhancement.applications.0.parameters.volume": {
            "expander": {
                "type": "fluid.afaStore.transform.afaUnSupportedUIOSettings",
                "path": "volume"
            }
        }
    };
    
    fluid.afaStore.UIOtoAfAUIOApprules = {
        "control": "control",
        "content": "content",
        "display": {
            "expander": {
                "type": "fluid.afaStore.transform.fleshOutUIOSettings",
                "path": "display"
            }
        }
    };
    
})(jQuery, fluid_1_5);
