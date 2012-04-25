/*
Copyright 2012 OCAD University

Licensed under the Educational Community License (ECL), Version 2.0 or the New
BSD license. You may not use this file except in compliance with one these
Licenses.

You may obtain a copy of the ECL 2.0 License and BSD License at
https://github.com/fluid-project/infusion/raw/master/Infusion-LICENSE.txt
*/

// Declare dependencies
/*global fluid, jqUnit, expect, jQuery*/

// JSLint options 
/*jslint white: true, funcinvoke: true, undef: true, newcap: true, nomen: true, regexp: true, bitwise: true, browser: true, forin: true, maxerr: 100, indent: 4 */

(function ($) {
    $(document).ready(function () {

/**************************************************************
 * These two settings objects are for 'documentation' purposes;
 * They are not actually used by tests
 */
        // UIO automatically saves all settings all the time, so any UIO object that is to be
        // processed will always contain all of these properties
        // On the other hand, when creating a UIO settings object, we don't need to create all of them
        var testUIOSettingsAll = {
            // NOTE: settings that AfA doesn't support still need to be preserved
            textSize: "1.6",
            textFont: "times",
            theme: "yb",
            lineSpacing: 1.4,
            toc: true,
            links: true,
            inputsLarger: true,
            layout: true,
            captions: true,
            transcripts: true,
            language: "fr",
            volume: 42
        };

        // An AfA settings object will not necessarily contain all of these preferences
        var testAfASettingsAll = {
            // we'll need to preserve unsupported settings (e.g. magnification)
            display: {
                screenEnhancement: {
                    fontFace: {
                        fontName: ["Times New Roman"], // necessary?
                        genericFontFace: "serif"
                    },
                    fontSize: 19.2,
                    foregroundColor: "yellow", // what format should these be?
                    backgroundColor: "black",  // hex? rgb? css strings?
                    invertColourChoice: false
                }
            },
            control: {
                structuralNavigation: {
                    tableOfContents: true
                }
            },
            content: {
                adaptationPreference: [{
                    adaptationType: "caption",
                    language: "fr"
                },{
                    representationForm: ["transcript"],
                    language: "fr"
                }]
            }
        };
/**
 * end 'documentation' preferences
 *****************************************************/

        var tests = new jqUnit.TestCase("Access for All Store Tests");

        var theStore = fluid.afaStore({
            rulesURL: "../../../../components/uiOptions/AfATransformRules/"
        });

        /**
         * Test text size
         */

        tests.test("UIO to AFA: text size", function () {
            var afaResult = theStore.UIOtoAfA({textSize: "1.6"});
            jqUnit.assertEquals("Size converts properly", 32, afaResult.display.screenEnhancement.fontSize);
        });

        tests.test("AfA to UIO: text size", function () {
            var afaSettings = {
                display: {
                    screenEnhancement: {
                        fontSize: 32
                    }
                }
            };
            var uioResult = theStore.AfAtoUIO(afaSettings);
            jqUnit.assertEquals("Size converts properly", "1.6", uioResult.textSize);
        });

        /**
         *  Test font transformations
         */

        tests.test("UIO to AfA: fonts", function () {
            var afaResult = theStore.UIOtoAfA({textFont: "times"});
            jqUnit.assertEquals("Font name for 'times'", "Times New Roman", afaResult.display.screenEnhancement.fontFace.fontName[0]);
            jqUnit.assertEquals("Font face for 'times'", "serif", afaResult.display.screenEnhancement.fontFace.genericFontFace);

            afaResult = theStore.UIOtoAfA({textFont: "verdana"});
            jqUnit.assertEquals("Font name for 'verdana'", "Verdana", afaResult.display.screenEnhancement.fontFace.fontName[0]);
            jqUnit.assertEquals("Font face for 'verdana'", "sans serif", afaResult.display.screenEnhancement.fontFace.genericFontFace);

            afaResult = theStore.UIOtoAfA({textFont: "default"});
            jqUnit.assertUndefined("No result for 'default'", afaResult.screenEnhancement);
        });
        tests.test("AfA to UIO: fonts", function () {
            var afaFontFamilySettings = {
                display: {
                    screenEnhancement: {
                        fontFace: {
                            // For this iteration, we're going to ignore the font name
                            genericFontFace: "serif"
                        }
                    }
                }
            };
            var uioResult = theStore.AfAtoUIO(afaFontFamilySettings);
            jqUnit.assertEquals("serif", "times", uioResult.textFont);

            afaFontFamilySettings.display.screenEnhancement.fontFace.genericFontFace = "sans serif";
            uioResult = theStore.AfAtoUIO(afaFontFamilySettings);
            jqUnit.assertEquals("sans serif", "verdana", uioResult.textFont);

            afaFontFamilySettings.display.screenEnhancement.fontFace.genericFontFace = "monospaced";
            uioResult = theStore.AfAtoUIO(afaFontFamilySettings);
            jqUnit.assertEquals("monospaced", "default", uioResult.textFont);

            afaFontFamilySettings.display.screenEnhancement.fontFace.genericFontFace = "fantasy";
            uioResult = theStore.AfAtoUIO(afaFontFamilySettings);
            jqUnit.assertEquals("fantasy", "default", uioResult.textFont);

            afaFontFamilySettings.display.screenEnhancement.fontFace.genericFontFace = "cursive";
            uioResult = theStore.AfAtoUIO(afaFontFamilySettings);
            jqUnit.assertEquals("cursive", "default", uioResult.textFont);

            uioResult = theStore.AfAtoUIO({});
            jqUnit.assertUndefined("no result for no setting", uioResult.textFont);
        });

        /**
         *  Test table of contents transformations
         */

        tests.test("UIO to AfA: Table of contents", function () {
            var afaResult = theStore.UIOtoAfA({toc: true});
            jqUnit.assertEquals("Table of contents on", true, afaResult.control.structuralNavigation.tableOfContents);

            var afaResult = theStore.UIOtoAfA({toc: false});
            jqUnit.assertEquals("Table of contents off", false, afaResult.control.structuralNavigation.tableOfContents);

            var afaResult = theStore.UIOtoAfA({});
            jqUnit.assertUndefined("no result for no setting", afaResult.control);
        });
        tests.test("AfA to UIO: Table of contents", function () {
            var afaTocSettings = {
                control: {
                    structuralNavigation: {
                        tableOfContents: true
                    }
                }
            };
            var uioResult = theStore.AfAtoUIO(afaTocSettings);
            jqUnit.assertEquals("Table of contents: true", true, uioResult.toc);

            afaTocSettings.control.structuralNavigation.tableOfContents = false;
            uioResult = theStore.AfAtoUIO(afaTocSettings);
            jqUnit.assertEquals("Table of contents: false", false, uioResult.toc);

            uioResult = theStore.AfAtoUIO({});
            jqUnit.assertUndefined("no result for no setting", uioResult.toc);
        });

        /**
         *  Test caption transformations
         */
        tests.test("UIO to AfA: Captions", function () {
            var uioCaptions = {
                captions: true,
                language: "fr"
            };
            var expectedAfa = {
                content: {
                    adaptationPreference: [{
                        adaptationType: "caption",
                        language: "fr"
                    },{
                        // for now we assume there are always two adaptationPreferences,
                        // and first one is captions
                    }]
                }
            };
            var afaResult = theStore.UIOtoAfA(uioCaptions);
            jqUnit.assertEquals("adaptation type", expectedAfa.content.adaptationPreference[0].adaptationType, afaResult.content.adaptationPreference[0].adaptationType);
            jqUnit.assertEquals("Caption language", expectedAfa.content.adaptationPreference[0].language, afaResult.content.adaptationPreference[0].language);
            
            afaResult = theStore.UIOtoAfA({});
            jqUnit.assertDeepEq("Empty object for no setting", {}, afaResult.content.adaptationPreference[0]);
        });
        tests.test("AfA to UIO: Captions", function () {
            var afaCaptions = {
                content: {
                    adaptationPreference: [{
                        adaptationType: "caption",
                        language: "fr"
                    }]
                }
            };
            var expectedUIO = {
                captions: true,
                language: "fr"
            };
            var uioResult = theStore.AfAtoUIO(afaCaptions);
            jqUnit.assertEquals("Captions", expectedUIO.captions, uioResult.captions);
            jqUnit.assertEquals("language", expectedUIO.language, uioResult.language);
        });

        /**
         *  Test transcript transformations
         */

        tests.test("UIO to AfA: Transcripts", function () {
            var uioTranscripts = {
                transcripts: true,
                language: "es"
            };
            var expectedAfa = {
                content: {
                    adaptationPreference: [{
                        // for now we assume there are always two adaptationPreferences,
                        // and second one is captions
                    },{
                        representationForm: ["transcript"],
                        language: "es"
                    }]
                }
            };
            var afaResult = theStore.UIOtoAfA(uioTranscripts);
            jqUnit.assertEquals("representation form", expectedAfa.content.adaptationPreference[1].representationForm[0], afaResult.content.adaptationPreference[1].representationForm[0]);
            jqUnit.assertEquals("Transcript language", expectedAfa.content.adaptationPreference[1].language, afaResult.content.adaptationPreference[1].language);
            
            afaResult = theStore.UIOtoAfA({});
            jqUnit.assertDeepEq("Empty object for no setting", {}, afaResult.content.adaptationPreference[1]);
        });
        tests.test("AfA to UIO: Transcripts", function () {
            var afaTranscript = {
                content: {
                    adaptationPreference: [{
                        representationForm: ["transcript"],
                        language: "fr"
                    }]
                }
            };
            var expectedUIO = {
                transcripts: true,
                language: "fr"
            };
            var uioResult = theStore.AfAtoUIO(afaTranscript);
            jqUnit.assertEquals("Transcripts", expectedUIO.transcripts, uioResult.transcripts);
            jqUnit.assertEquals("language", expectedUIO.language, uioResult.language);
        });


        /**
         * Test both captions and transcripts
         */
        tests.test("UIO to AfA: Captions and Transcripts", function () {
            var uioCaptions = {
                captions: true,
                transcripts: true,
                language: "eo"
            };
            var expectedAfa = {
                content: {
                    adaptationPreference: [{
                        adaptationType: "caption",
                        language: "eo"
                    },{
                        representationForm: ["transcript"],
                        language: "eo"
                    }]
                }
            };
            var afaResult = theStore.UIOtoAfA(uioCaptions);
            jqUnit.assertEquals("adaptation type", expectedAfa.content.adaptationPreference[0].adaptationType, afaResult.content.adaptationPreference[0].adaptationType);
            jqUnit.assertEquals("Caption language", expectedAfa.content.adaptationPreference[0].language, afaResult.content.adaptationPreference[0].language);
            jqUnit.assertEquals("representation form", expectedAfa.content.adaptationPreference[1].representationForm[0], afaResult.content.adaptationPreference[1].representationForm[0]);
            jqUnit.assertEquals("Transcript language", expectedAfa.content.adaptationPreference[1].language, afaResult.content.adaptationPreference[1].language);
        });
        tests.test("AfA to UIO: Captions and Transcripts", function () {
            var expectedUIO = {
                captions: true,
                transcripts: true,
                language: "eo"
            };
            var afaAdaptations = {
                content: {
                    adaptationPreference: [{
                        adaptationType: "caption",
                        language: "eo"
                    },{
                        representationForm: ["transcript"],
                        language: "es"
                    }]
                }
            };
            var uioResult = theStore.AfAtoUIO(afaAdaptations);
            jqUnit.assertEquals("Captions", expectedUIO.captions, uioResult.captions);
            jqUnit.assertEquals("Transcripts", expectedUIO.transcripts, uioResult.transcripts);
            jqUnit.assertEquals("language", expectedUIO.language, uioResult.language);
        });

        /**
         * Theme tests
         */
        tests.test("AfA to UIO: theme", function () {
            var testAfA = {
                display: {
                    screenEnhancement: {
                        foregroundColor: "yellow",
                        backgroundColor: "black"
                    }
                }
            };
            var uioResult = theStore.AfAtoUIO(testAfA);
            jqUnit.assertEquals("yellow-on-black", "yb", uioResult.theme);

            testAfA.display.screenEnhancement.foregroundColor = "black";
            testAfA.display.screenEnhancement.backgroundColor = "yellow";
            uioResult = theStore.AfAtoUIO(testAfA);
            jqUnit.assertEquals("black-on-yellow", "by", uioResult.theme);

            testAfA.display.screenEnhancement.foregroundColor = "black";
            testAfA.display.screenEnhancement.backgroundColor = "white";
            uioResult = theStore.AfAtoUIO(testAfA);
            jqUnit.assertEquals("black-on-white", "bw", uioResult.theme);

            testAfA.display.screenEnhancement.foregroundColor = "white";
            testAfA.display.screenEnhancement.backgroundColor = "black";
            uioResult = theStore.AfAtoUIO(testAfA);
            jqUnit.assertEquals("white-on-black", "wb", uioResult.theme);

            testAfA.display.screenEnhancement.foregroundColor = "green";
            testAfA.display.screenEnhancement.backgroundColor = "black";
            uioResult = theStore.AfAtoUIO(testAfA);
            jqUnit.assertUndefined("unsupported combination should return undefined", uioResult.theme);

            testAfA.display.screenEnhancement.foregroundColor = "yellow";
            testAfA.display.screenEnhancement.backgroundColor = undefined;
            uioResult = theStore.AfAtoUIO(testAfA);
            jqUnit.assertUndefined("missing colour should return undefined", uioResult.theme);
        });

        tests.test("UIO to AfA: theme", function () {
            var afaResult = theStore.UIOtoAfA({theme: "yb"});
            jqUnit.assertEquals("YB Foreground", "yellow", afaResult.display.screenEnhancement.foregroundColor);
            jqUnit.assertEquals("YB Background", "black", afaResult.display.screenEnhancement.backgroundColor);

            afaResult = theStore.UIOtoAfA({theme: "by"});
            jqUnit.assertEquals("BY Foreground", "black", afaResult.display.screenEnhancement.foregroundColor);
            jqUnit.assertEquals("BY Background", "yellow", afaResult.display.screenEnhancement.backgroundColor);

            afaResult = theStore.UIOtoAfA({theme: "wb"});
            jqUnit.assertEquals("WB Foreground", "white", afaResult.display.screenEnhancement.foregroundColor);
            jqUnit.assertEquals("WB Background", "black", afaResult.display.screenEnhancement.backgroundColor);

            afaResult = theStore.UIOtoAfA({theme: "bw"});
            jqUnit.assertEquals("BW Foreground", "black", afaResult.display.screenEnhancement.foregroundColor);
            jqUnit.assertEquals("BW Background", "white", afaResult.display.screenEnhancement.backgroundColor);

            afaResult = theStore.UIOtoAfA({theme: "default"});
            jqUnit.assertUndefined("No results for default setting", afaResult.display.screenEnhancement.foregroundColor);
            jqUnit.assertUndefined("No results for default setting", afaResult.display.screenEnhancement.backgroundColor);
        });

        tests.test("AfA caption and transcript language different", function () {
            jqUnit.assertFalse("No tests yet", true);
        });

        tests.test("Extra settings preserved", function () {
            jqUnit.assertFalse("No tests yet", true);
        });
    });
})(jQuery);
