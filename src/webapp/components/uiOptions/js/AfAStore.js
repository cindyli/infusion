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
            rulesReady: null,
            afterSave: null
        },
        listeners: {
            afterSave: "{that}.afterSaveHandler"
        },
        preInitFunction: "fluid.afaStore.preInit",
        prefsServerURL: "http://localhost:8080/store/",
        userToken: "123"
    });

    fluid.afaStore.preInit = function (that) {
        // This listener will check if there are any outstanding saves pending and will make
        // at most one additinal save of the latest settings state.
        that.afterSaveHandler = function () {
            if (that.settings) {
                that.save(that.settings);
            }
        };
    };

    fluid.afaStore.getServerURL = function (prefsServerURL, userToken) {
        return prefsServerURL + userToken;
    };
    
    fluid.afaStore.fetch = function (that) {
        $.get(fluid.afaStore.getServerURL(that.options.prefsServerURL, that.options.userToken), function (data) {
            that.events.settingsReady.fire($.extend(true, {}, that.options.defaultSiteSettings, that.AfAtoUIO(data)));
        }, "json");
    };

    fluid.afaStore.save = function (settings, that) {
        if (that.saving) {
            that.settings = settings;
            return;
        }

        that.saving = true;
        if (that.settings) {
            delete that.settings;
        }

        $.ajax({
            url: fluid.afaStore.getServerURL(that.options.prefsServerURL, that.options.userToken),
            type: "POST",
            data: JSON.stringify(that.UIOtoAfA(settings)),
            headers: {
                "Accept": "application/json",
                "Content-type": "application/json"
            },
            dataType: "json",
            success: function (data) {
                if (!data.error) {
                    fluid.merge(null, that.originalAfAPrefs, data);
                }
                delete that.saving;
                // Check if there were other attempts to save.
                that.events.afterSave.fire();
            }
        });
    };

    fluid.afaStore.AfAtoUIO = function (settings, that) {
        // Save the original AfA settings in order to preserve UIO unsupported AfA preferences
        that.originalAfAPrefs = fluid.copy(settings);
        
        return fluid.model.transform.sequence(settings, [
            fluid.afaStore.AfAtoUIOScreenEnhanceRules, 
            fluid.afaStore.AfAtoUIOAdaptPrefRules,
            fluid.afaStore.AfAtoUIOrules]);
    };
    
    fluid.afaStore.UIOtoAfA = function (settings, that) {
        var UIOTransformedSettings = fluid.model.transform.sequence(settings, [
            fluid.afaStore.UIOtoAfArules, 
            fluid.afaStore.UIOtoAfAUIOApprules
        ], {flatSchema: fluid.afaStore.UIOtoAfAschema});
        
        // Preserve the AfA preferences that are not UIO supported
        if (that.originalAfAPrefs) {
            var target = fluid.copy(that.originalAfAPrefs);

            // Remove the original AfA preferences that are supposed to be transformed from UIO
            // so that the empty AfA settings won't re-filled by the original ones.
            fluid.each(fluid.afaStore.UIOtoAfArules, function (value, key) {
                if (fluid.get(target, key)) {
                    var segs = key.split("."),
                        thisKey = segs.pop();
                    
                    // delete an object
                    delete fluid.get(target, segs.join("."))[thisKey];
                }
            });
            
            fluid.merge({
                "display.screenEnhancement.applications": fluid.afaStore.mergeApps
            }, target, UIOTransformedSettings);
            return target;
        } else {
            return UIOTransformedSettings;
        }
    };
    
    
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
     * Produce a caption AfA adaptationPreference object.
     * This transformer assumes knowledge of the "language" path in the source model.
     */
    fluid.afaStore.transform.afaCaption = function (expanded, expander, expandSpec) {
        var cap = fluid.get(expander.source, expandSpec.inputPath);
        if (!cap) {
            return {};
        }
        return {
            adaptationType: "caption",
            language: fluid.get(expander.source, "language")
        };
    };

    /**
     * Produce a transcript AfA adaptationPreference object.
     * This transformer assumes knowledge of the "language" path in the source model.
     */
    fluid.afaStore.transform.afaTranscript = function (expanded, expander, expandSpec) {
        var tran = fluid.get(expander.source, expandSpec.inputPath);
        if (!tran) {
            return {};
        }
        return {
            representationForm: ["transcript"],
            language: fluid.get(expander.source, "language")
        };
    };
    
    /**
     * Intermediate process: flatten the array of adaptationPreferences
     */
    fluid.afaStore.transform.flattenAdaptPrefs = function (expanded, expander, expandSpec) {
        var adaptPrefs = fluid.get(expander.source, expandSpec.inputPath);
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
    fluid.afaStore.transform.simplifyScreenEnhance = function (expanded, expander, expandSpec) {
        var val = fluid.get(expander.source, expandSpec.inputPath);
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
    fluid.afaStore.transform.fontFactor = function (expanded, expander, expandSpec) {
        var val = fluid.get(expander.source, expandSpec.inputPath);
        if (!val) {
            return;
        }

        return Math.round(parseFloat(val / baseDocumentFontSize()) * 10) / 10;
    };

    /**
     * Converts UIO fontSize setting to AfA
     */
    fluid.afaStore.transform.fontSize = function (expanded, expander, expandSpec) {
        var val = fluid.get(expander.source, expandSpec.inputPath);
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
    fluid.afaStore.transform.coloursToTheme = function (expanded, expander, expandSpec) {
        var fg = fluid.get(expander.source, expandSpec.fgpath);
        var bg = fluid.get(expander.source, expandSpec.bgpath);
        if (colourTable[fg]) {
            return colourTable[fg][bg];
        }
    };
    
    /**
     * Convert a foreground/background colour combination into a theme name.
     * Assumptions: If one of the colours is not specified, we cannot identify a theme.
     */
    fluid.afaStore.transform.strToNum = function (expanded, expander, expandSpec) {
        var val = fluid.get(expander.source, expandSpec.inputPath);
        if (typeof (val) !== "undefined") {
            return parseFloat(val);
        }
    };
    
    /**
     * Convert AfA-unsupported UIO settings into AfA preference string.
     */
    fluid.afaStore.transform.afaUnSupportedUIOSettings = function (expanded, expander, expandSpec) {
        var val = fluid.get(expander.source, expandSpec.inputPath);
        if (!val && val !== false) {
            return;
        }
        
        return typeof val === "number" ? val.toString() : val;
    };
    
    /**
     * Complete the node for preserving AfA-unsupported UIO settings
     */
    fluid.afaStore.transform.fleshOutUIOSettings = function (expanded, expander, expandSpec) {
        var fullVal = fluid.get(expander.source, expandSpec.inputPath);
        var val = fluid.get(fullVal, "screenEnhancement.applications.0.parameters");
        if (!val) {
            return fullVal;
        }
        
        fullVal.screenEnhancement.applications[0].name = "UI Options";
        fullVal.screenEnhancement.applications[0].id = "fluid.uiOptions";
        
        return fullVal;
    };

    /**********************************************
     * Transformation Rules
     **********************************************/

    fluid.afaStore.AfAtoUIOrules = {
        "textFont": {
            "expander": {
                "type": "fluid.model.transform.valueMapper",
                "inputPath": "display.screenEnhancement.fontFace.genericFontFace",
                "_comment": "TODO: For now, this ignores the actual 'fontName' setting",
                "options": {
                    "serif": "times",
                    "sans serif": "verdana",
                    "monospaced": "default",
                    "fantasy": "default",
                    "cursive": "default",
                    "undefined": {
                        undefinedOutputValue: true
                    }
                }
            }
        },
        "textSize": {
            "expander": {
                "type": "fluid.afaStore.transform.fontFactor",
                "inputPath": "display.screenEnhancement.fontSize"
            }
        },
        "toc": {
            "expander": {
                "type": "fluid.model.transform.value",
                "inputPath": "control.structuralNavigation.tableOfContents"
            }
        },
        "captions": {
            "expander": {
                "type": "fluid.model.transform.value",
                "inputPath": "flatAdaptationPreferences.captions"
            }
        },
        "transcripts": {
            "expander": {
                "type": "fluid.model.transform.value",
                "inputPath": "flatAdaptationPreferences.transcripts"
            }
        },
        "language": {
            "expander": {
                "type": "fluid.model.transform.value",
                "inputPath": "flatAdaptationPreferences.language"
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
                "inputPath": "display.screenEnhancement.applications.0.parameters.lineSpacing"
            }
        },
        "links": "display.screenEnhancement.applications.0.parameters.links",
        "inputsLarger": "display.screenEnhancement.applications.0.parameters.inputsLarger",
        "layout": "display.screenEnhancement.applications.0.parameters.layout",
        "volume": {
            "expander": {
                "type": "fluid.afaStore.transform.strToNum",
                "inputPath": "display.screenEnhancement.applications.0.parameters.volume"
            }
        }
    };

    fluid.afaStore.AfAtoUIOAdaptPrefRules = {
        "flatAdaptationPreferences": {
            "expander": {
                "type": "fluid.afaStore.transform.flattenAdaptPrefs",
                "inputPath": "content.adaptationPreference"
            }
        },
        "display": "display",
        "control": "control"
    };

    fluid.afaStore.AfAtoUIOScreenEnhanceRules = {
        "display.screenEnhancement": {
            "expander": {
                "type": "fluid.afaStore.transform.simplifyScreenEnhance",
                "inputPath": "display.screenEnhancement"
            }
        },
        "content": "content",
        "control": "control"
    };
    
    fluid.afaStore.UIOtoAfAschema = {
        "display.screenEnhancement.applications": "array",
        "content.adaptationPreference": "array"
    };
    
    fluid.afaStore.UIOtoAfArules = {
        "display.screenEnhancement.fontFace": {
            "expander": {
                "type": "fluid.model.transform.valueMapper",
                "inputPath": "textFont",
                "options": {
                    "times": {
                        "outputValue": {
                            "fontName": ["Times New Roman"],
                            "genericFontFace": "serif"
                        }
                    },
                    "verdana": {
                        "outputValue": {
                            "fontName": ["Verdana"],
                            "genericFontFace": "sans serif"
                        }
                    },
                    "arial": {
                        "outputValue": {
                            "fontName": ["Arial"],
                            "genericFontFace": "sans serif"
                        }
                    },
                    "comic": {
                        "outputValue": {
                            "fontName": ["Comic Sans"],
                            "genericFontFace": "sans serif"
                        }
                    },
                    "undefined": {
                        undefinedOutputValue: true
                    }
                }
            }
        },
        "display.screenEnhancement.fontSize": {
            "expander": {
                "type": "fluid.afaStore.transform.fontSize",
                "inputPath": "textSize"
            }
        },
        "control.structuralNavigation.tableOfContents": {
            "expander": {
                "type": "fluid.model.transform.value",
                "inputPath": "toc"
            }
        },
        "_comment": "NB: This will always place transcripts second in the array, even if there are no captions",
        "content.adaptationPreference.0": {
            "expander": {
                "type": "fluid.afaStore.transform.afaCaption",
                "inputPath": "captions"
            }
        },
        "content.adaptationPreference.1": {
            "expander": {
                "type": "fluid.afaStore.transform.afaTranscript",
                "inputPath": "transcripts"
            }
        },
        "display.screenEnhancement.foregroundColor": {
            "expander": {
                "type": "fluid.model.transform.valueMapper",
                "inputPath": "theme",
                "options": {
                    "yb": "yellow",
                    "by": "black",
                    "wb": "white",
                    "bw": "black",
                    "undefined": {
                        undefinedOutputValue: true
                    }
                }
            }
        },
        "display.screenEnhancement.backgroundColor": {
            "expander": {
                "type": "fluid.model.transform.valueMapper",
                "inputPath": "theme",
                "options": {
                    "yb": "black",
                    "by": "yellow",
                    "wb": "black",
                    "bw": "white",
                    "undefined": {
                        undefinedOutputValue: true
                    }
                }
            }
        },
        "display.screenEnhancement.applications.0.parameters.lineSpacing": {
            "expander": {
                "type": "fluid.afaStore.transform.afaUnSupportedUIOSettings",
                "inputPath": "lineSpacing"
            }
        },
        "display.screenEnhancement.applications.0.parameters.links": {
            "expander": {
                "type": "fluid.afaStore.transform.afaUnSupportedUIOSettings",
                "inputPath": "links"
            }
        },
        "display.screenEnhancement.applications.0.parameters.inputsLarger": {
            "expander": {
                "type": "fluid.afaStore.transform.afaUnSupportedUIOSettings",
                "inputPath": "inputsLarger"
            }
        },
        "display.screenEnhancement.applications.0.parameters.layout": {
            "expander": {
                "type": "fluid.afaStore.transform.afaUnSupportedUIOSettings",
                "inputPath": "layout"
            }
        },
        "display.screenEnhancement.applications.0.parameters.volume": {
            "expander": {
                "type": "fluid.afaStore.transform.afaUnSupportedUIOSettings",
                "inputPath": "volume"
            }
        }
    };
    
    fluid.afaStore.UIOtoAfAUIOApprules = {
        "control": "control",
        "content": "content",
        "display": {
            "expander": {
                "type": "fluid.afaStore.transform.fleshOutUIOSettings",
                "inputPath": "display"
            }
        }
    };
    
})(jQuery, fluid_1_5);
