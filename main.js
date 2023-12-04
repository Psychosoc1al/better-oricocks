// ==UserScript==
// @name         Better OriCOCKs
// @version      3.0.15
// @description  Изменение подсчёта баллов и местами дизайна, а также добавление/доработка расписания
// @source       https://github.com/Psychosoc1al/better-oricocks
// @author       Psychosoc1al
// @license      MIT
// @namespace    https://github.com/Psychosoc1al
// @match        https://orioks.miet.ru/*
// @icon         https://orioks.miet.ru/favicon.ico
// @run-at       document-body
// @connect      miet.ru
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

(() => {
    "use strict";

    /**
     * Changes the body width to make the interface wider and more readable.
     * Separate function for convenience to be used on different pages
     */
    const changeBodyWidth = function () {
        for (const sheet of document.styleSheets)
            if (
                sheet.href?.includes(
                    "https://orioks.miet.ru/libs/bootstrap/bootstrap.min.css",
                )
            ) {
                for (const element of sheet.cssRules)
                    if (element.cssText.includes("1170px"))
                        element["cssRules"][0].style.width = "1330px";
                return;
            }
    };

    /**
     * Save a key-value pair to the storage
     *
     * @param {string} key - The key to save
     * @param {string | Object} value - The value to save
     */
    const saveKeyValue = function (key, value) {
        // noinspection JSUnresolvedReference
        GM.setValue(key, value);
    };

    /**
     * Retrieves the value associated with the given key
     *
     * @param {string} key - The key to retrieve the value for
     * @return {Promise<string>} - The value associated with the given key
     */
    const loadValueByKey = function (key) {
        // noinspection JSUnresolvedReference,JSCheckFunctionSignatures
        return GM.getValue(key);
    };

    /**
     * Generates a darker version of an RGB color by reducing the brightness.
     *
     * @param {string} rgbColor - The RGB color to make darker.
     * @param {number} amount - The amount by which to darken the color.
     * @return {string} The darker version of the RGB color.
     */
    const changeColorBrightness = function (rgbColor, amount) {
        if (!rgbColor.match(/\d+/g)) return "";

        let result = "rgb(#, #, #)";

        rgbColor
            .split(")")[0]
            .match(/\d+/g)
            .forEach((color) => {
                color = parseInt(color) + amount;
                color = Math.min(Math.max(0, color), 255);

                result = result.replace("#", color.toString());
            });

        return result;
    };

    // check to know if we are on the page with grades
    if (document.URL.includes("student/student")) {
        const group = document
            .querySelector('select[name="student_id"] option[selected]')
            .innerText.split(" ")[0];
        const weeksNumbers = {
            "1 числитель": 0,
            "1 знаменатель": 1,
            "2 числитель": 2,
            "2 знаменатель": 3,
        };

        /**
         * Sends a request to the schedule server
         *
         * @param {string} url - The URL to send the request to
         * @param {string} method - The request method
         * @param {string} cookie - The cookie to include in the request headers
         * @return {Promise<Object>} A promise that resolves with the response text
         */
        const sendRequest = function (url, method, cookie = "") {
            // noinspection JSUnresolvedReference,JSUnusedGlobalSymbols
            return GM.xmlHttpRequest({
                url: url,
                method: method,
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    Cookie: cookie,
                },
                data: `group=${group}`,
                onload: function (responsePromise) {
                    return responsePromise;
                },
                onerror: function (response) {
                    console.log(response);
                },
            });
        };

        /**
         * Adjusts a number to be integer if possible and rounded to at most 2 decimal places if not
         *
         * @param {number} number - The number to be adjusted
         * @return {string} The adjusted number as a string
         */
        const numberToFixedString = function (number) {
            if (!number) return "0";

            let stringedNumber = number.toFixed(2);

            while (stringedNumber.endsWith("0"))
                stringedNumber = stringedNumber.slice(0, -1);

            if (stringedNumber.endsWith("."))
                stringedNumber = stringedNumber.slice(0, -1);

            return stringedNumber;
        };

        /**
         * Gets the grade string representation and its type (projection to five-ball system)
         *
         * @param {number} gradeRatio - the grade ratio (grade / maxGrade)
         * @param {string} controlForm - the control type to check if it is a credit
         *
         * @return {[string, number]} The new grade class as a string
         */
        const getGradeNameAndType = function (gradeRatio, controlForm) {
            const isCredit = controlForm === "Зачёт";

            if (gradeRatio < 0.5) {
                if (gradeRatio < 0.2) return ["Не зачтено", 1];
                return ["Не зачтено", 2];
            } else if (gradeRatio < 0.7)
                return [isCredit ? "Зачтено" : "Удовлетворительно", 3];
            else if (gradeRatio < 0.86)
                return [isCredit ? "Зачтено" : "Хорошо", 4];
            else return [isCredit ? "Зачтено" : "Отлично", 5];
        };

        /**
         * Changes the size of numeric and string grade fields
         */
        const changeGradeFieldsSizes = function () {
            for (const sheet of document.styleSheets)
                if (
                    sheet.href?.includes(
                        "https://orioks.miet.ru/controller/student/student.css",
                    )
                ) {
                    for (const element of sheet.cssRules) {
                        if (element.selectorText === ".w46")
                            element.style.width = "34px";
                        if (
                            [".grade", "#bp"].includes(element["selectorText"])
                        ) {
                            element.style.width = "45px";
                            element.style.padding = "3px";
                        }
                    }
                    break;
                }
            document.querySelector('span[style="width: 60px"]').style.width =
                "fit-content";
        };

        /**
         * Sets the schedule CSS.
         */
        const setScheduleCSS = function () {
            for (const sheet of document.styleSheets)
                if (
                    sheet.href?.includes(
                        "https://orioks.miet.ru/libs/bootstrap/bootstrap.min.css",
                    )
                ) {
                    for (const element of sheet.cssRules)
                        if (
                            element.cssText.startsWith(".table") &&
                            element.style &&
                            element.style.marginTop
                        ) {
                            element.style.marginTop = "5px";
                        }
                    break;
                }

            document
                .querySelectorAll('tr[ng-repeat="c in data"] span')
                .forEach((elem) => (elem.style["white-space"] = "pre-line"));
        };

        /**
         * Gets the schedule by sending a request and passing the protection(?) with setting the cookie
         *
         * @return {Promise<Object>} A JSON object containing the schedule
         */
        const getSchedule = function () {
            return sendRequest("https://miet.ru/schedule/data", "POST").then(
                (responseObject) => {
                    const cookie =
                        responseObject.responseText.match(/wl=.*;path=\//);
                    if (cookie)
                        return sendRequest(
                            "https://miet.ru/schedule/data",
                            "POST",
                            cookie[0],
                        ).then((responseObject) =>
                            JSON.parse(responseObject.responseText),
                        );

                    return JSON.parse(responseObject.responseText);
                },
            );
        };

        /**
         * Parses the schedule data received from the server
         *
         * @return {Promise<Array<Object>>} An array of parsed and formatted schedule elements
         */
        const parseSchedule = function () {
            return getSchedule().then((responseJSON) => {
                const parsedSchedule = [];

                for (const responseJSONElement of responseJSON["Data"]) {
                    const scheduleElement = {};

                    scheduleElement["name"] =
                        responseJSONElement["Class"]["Name"];
                    scheduleElement["teacher"] =
                        responseJSONElement["Class"]["TeacherFull"];
                    scheduleElement["dayNumber"] = responseJSONElement["Day"];
                    scheduleElement["weekNumber"] =
                        responseJSONElement["DayNumber"];
                    scheduleElement["room"] =
                        responseJSONElement["Room"]["Name"];
                    scheduleElement["lessonNumber"] =
                        responseJSONElement["Time"]["Time"];
                    scheduleElement["startTime"] = new Date(
                        responseJSONElement["Time"]["TimeFrom"],
                    ).toLocaleTimeString("ru", {
                        hour: "2-digit",
                        minute: "2-digit",
                    });
                    scheduleElement["endTime"] = new Date(
                        responseJSONElement["Time"]["TimeTo"],
                    ).toLocaleTimeString("ru", {
                        hour: "2-digit",
                        minute: "2-digit",
                    });

                    parsedSchedule.push(scheduleElement);
                }

                return parsedSchedule;
            });
        };

        /**
         * Updates the schedule and processes it
         */
        const processSchedule = function () {
            loadValueByKey("schedule").then((schedule) => {
                parseSchedule().then((parsedSchedule) => {
                    saveKeyValue("schedule", parsedSchedule);
                    if (!schedule) window.location.reload();
                });

                if (schedule) {
                    const parsedSchedule = JSON.parse(JSON.stringify(schedule));
                    const closestLessons = getClosestLessons(parsedSchedule);
                    setSchedule(closestLessons);
                }
            });
        };

        /**
         * Sets the schedule based on the current time and day or on finds the closest lessons
         *
         * @param {Object} schedule - The whole schedule object
         * @param {number} daysOffset - The offset in days from the current day to start search
         * @param {boolean} weekChanged - Whether the week has changed while searching the closest day
         * @return {Object[]} The closest two days lessons list
         */
        const getClosestLessons = function (
            schedule,
            daysOffset = 0,
            weekChanged = false,
        ) {
            let currentTime, currentDayNumber;
            let date = new Date();
            let utcDate = new Date(
                date.getTime() + date.getTimezoneOffset() * 60 * 1000,
            );
            date = new Date(utcDate.getTime() + 3 * 60 * 60 * 1000);

            if (daysOffset === 0) {
                currentTime = date.toLocaleTimeString("ru", {
                    hour: "2-digit",
                    minute: "2-digit",
                    hour12: false,
                });
                currentDayNumber = date.getDay();
            } else {
                date.setDate(date.getDate() + daysOffset);

                currentTime = "00:00";
                currentDayNumber = date.getDay();
            }

            let stringCurrentWeek = document
                .querySelector(".small")
                .innerText.split("\n")[1];
            if (!stringCurrentWeek)
                stringCurrentWeek = document
                    .querySelector(".small")
                    .innerText.split(" ")
                    .slice(3)
                    .join(" ");
            let searchWeekNumber = weeksNumbers[stringCurrentWeek];
            let searchDayNumber = currentDayNumber - 1;
            let closestLessons = [];
            let nextOffset = daysOffset;

            if (typeof searchWeekNumber === "undefined") return [];

            if (currentDayNumber === 0) {
                searchWeekNumber = ++searchWeekNumber % 4;
                searchDayNumber = 0;
                nextOffset++;
                weekChanged = true;
            } else if (weekChanged) searchWeekNumber = ++searchWeekNumber % 4;

            while (!closestLessons.length) {
                searchDayNumber = ++searchDayNumber % 7;
                nextOffset++;
                if (searchDayNumber === 0) {
                    searchWeekNumber = ++searchWeekNumber % 4;
                    searchDayNumber = 1;
                    nextOffset++;
                }

                closestLessons = schedule.filter(
                    (lesson) =>
                        lesson.dayNumber === searchDayNumber &&
                        lesson.weekNumber === searchWeekNumber &&
                        (currentDayNumber === searchDayNumber
                            ? lesson.endTime >= currentTime
                            : true) &&
                        !lesson.teacher.includes("УВЦ"),
                );
            }

            closestLessons.sort((a, b) => {
                return a.lessonNumber > b.lessonNumber ? 1 : -1;
            });

            date = new Date();
            date.setDate(date.getDate() + nextOffset - 1);
            const stringDate = date.toLocaleDateString("ru", {
                weekday: "long",
                day: "2-digit",
                month: "2-digit",
            });

            if (daysOffset === 0)
                return [
                    {
                        date: stringDate,
                        lessons: closestLessons,
                    },
                ].concat(getClosestLessons(schedule, nextOffset, weekChanged));
            return [
                {
                    date: stringDate,
                    lessons: closestLessons,
                },
            ];
        };

        /**
         * Updates the grade fields based on the newest data
         */
        const updateGrades = function () {
            const source = document.querySelector("#forang");
            const jsonData = JSON.parse(source.textContent);
            const disciplines = jsonData["dises"];

            for (const element of disciplines) {
                const controlPoints = element["segments"][0]["allKms"];
                const grade = element["grade"];
                const controlForm = element["formControl"]["name"];
                const maxPossibleSum = element["mvb"];
                let sum = 0;

                for (const element of controlPoints) {
                    const balls = element["balls"][0];

                    if (balls && balls["ball"] > 0) sum += balls["ball"];
                }

                grade["b"] = numberToFixedString(sum); // current ball
                grade["p"] = numberToFixedString((sum / maxPossibleSum) * 100); // current percentage
                // [maximal grade ("из ..."), class attribute for coloring]
                [grade["w"], grade["o"]] = getGradeNameAndType(
                    sum / maxPossibleSum,
                    controlForm,
                );
            }

            source.textContent = JSON.stringify(jsonData);
        };

        /**
         * Collapses multiplied lessons with the same name into one
         *
         * @param closestDays - The list of closest days with lessons (see {@link getClosestLessons()})
         * @return {Object[]} The list of closest days with refactored lessons
         */
        const collapseDuplicatedLessons = function (closestDays) {
            for (const day of closestDays) {
                const collapsedLessons = [];
                let currentLesson;
                let currentLessonNumber = 0;
                let lessonCount = 1;

                for (let i = 0; i < day.lessons.length; i++)
                    if (day.lessons[i].name === day.lessons[i + 1]?.name)
                        lessonCount++;
                    else {
                        if (lessonCount > 1) {
                            currentLesson = day.lessons[currentLessonNumber];
                            let name = currentLesson.name;
                            let amountPart = `(${lessonCount} пар${
                                lessonCount < 5 ? "ы" : ""
                            })`;

                            if (name.indexOf("[") !== -1)
                                name = name.replace("[", amountPart + " [");
                            else name += amountPart;

                            currentLesson.name = name;
                            collapsedLessons.push(currentLesson);
                        } else
                            collapsedLessons.push(
                                day.lessons[currentLessonNumber],
                            );

                        currentLessonNumber += lessonCount;
                        lessonCount = 1;
                    }

                day.lessons = collapsedLessons;
            }

            return closestDays;
        };

        /**
         * Sets the schedule based on the closest lessons
         *
         * @param closestDays - The list of closest days with lessons (see {@link getClosestLessons()})
         */
        const setSchedule = function (closestDays) {
            const source = document.querySelector("#forang");
            const jsonData = JSON.parse(source.textContent);
            const schedule = [];

            closestDays = collapseDuplicatedLessons(closestDays);
            for (let i = 0; i < closestDays.length; i++) {
                schedule[i] = [];
                schedule[i][0] = closestDays[i].date;
                schedule[i][1] = [];

                for (const lesson of closestDays[i].lessons) {
                    let lessonName, lessonType;
                    let lessonTypeMatch = lesson.name.match(/\[(.*)]/);

                    if (lessonTypeMatch) {
                        lessonName = lesson.name.match(/(.*) \[?/)[1];
                        lessonType = lessonTypeMatch[1];
                    } else {
                        lessonName = lesson.name;
                        lessonType = "";
                    }

                    schedule[i][1].push({
                        name: `${lessonName}
                            ► ${lesson.teacher}
                            `,
                        type: lessonType,
                        location: lesson.room,
                        time:
                            lesson.startTime === "12:00"
                                ? "12:00/30"
                                : lesson.startTime,
                    });
                }
            }

            jsonData["schedule"] = schedule;
            source.textContent = JSON.stringify(jsonData);
        };

        const setDarkMode = function () {
            const sheets = Array.from(document.styleSheets);
            const bootstrapSheet = sheets.find((sheet) =>
                sheet.href?.includes("bootstrap.min.css"),
            );
            const orioksSheet = sheets.find((sheet) =>
                sheet.href?.includes("orioks.css"),
            );
            const studentSheet = sheets.find((sheet) =>
                sheet.href?.includes("student.css"),
            );
            const switchSheet = sheets.find((sheet) =>
                sheet.href?.includes("bootstrap-switch.min.css"),
            );

            for (const element of bootstrapSheet.cssRules) {
                if (
                    [".well", ".breadcrumb"].some(
                        (elem) => element.selectorText === elem,
                    )
                ) {
                    element.style.backgroundColor = "#1b1d1e";
                    element.style.borderColor = "#363b3d";
                } else if (element.selectorText === ".label-default") {
                    element.style.backgroundColor = "#26292a";
                    element.style.color = "#aec2d3";
                } else if (element.selectorText === "select.input-sm") {
                    element.style.backgroundColor = "#1b1d1e";
                    element.style.borderColor = "#3e4446";
                    element.style.color = "#a29a8e";
                } else if (
                    [".table", ".table .table"].includes(element.selectorText)
                )
                    element.style.backgroundColor = "#181a1b";
                else if (
                    element.selectorText?.startsWith(
                        ".table-hover > tbody > tr:hover",
                    )
                )
                    element.style.backgroundColor = "#1e2021";
                else if (
                    [
                        ".table > tbody > tr > td",
                        ".table-hover > tbody > tr:hover > td",
                        ".table-hover > tbody > tr.info:hover > td",
                        ".table-hover > tbody > tr.success:hover > td",
                    ].some((elem) => element.selectorText?.includes(elem))
                ) {
                    element.style.borderTopColor = "#545b5e";
                    element.style.backgroundColor = changeColorBrightness(
                        element.style.backgroundColor,
                        -200,
                    );
                } else if (element.selectorText === ".table > thead > tr > th")
                    element.style.borderBottom = "2px solid #545b5e";
                else if (
                    [".label", ".navbar"].some((elem) =>
                        element.selectorText?.startsWith(elem),
                    ) &&
                    element.style
                )
                    element.style.backgroundColor = changeColorBrightness(
                        element.style.backgroundColor,
                        -35,
                    );
                else if (element.selectorText?.startsWith("a"))
                    element.style.color = changeColorBrightness(
                        element.style.color,
                        60,
                    );
                else if (
                    [".panel", ".list-group-item"].some(
                        (elem) => element.selectorText === elem,
                    )
                ) {
                    element.style.backgroundColor = "#1b1d1e";
                    element.style.border = "1px solid #545b5e";
                } else if (element.selectorText === ".panel-default")
                    element.style.borderColor = "#545b5e";
                else if (
                    element.selectorText === ".panel-default > .panel-heading"
                ) {
                    element.style.color = changeColorBrightness(
                        element.style.color,
                        40,
                    );
                    element.style.backgroundColor = "#181a1b";
                    element.style.borderColor = "#545b5e";
                } else if (
                    [".btn-success", ".btn-primary"].some(
                        (elem) => element.selectorText === elem,
                    )
                )
                    for (const style of element.style)
                        element.style[style] = changeColorBrightness(
                            element.style[style],
                            -30,
                        );
                else if (element.selectorText === ".modal-content")
                    element.style.backgroundColor = "#1b1d1e";
            }

            for (const element of orioksSheet.cssRules) {
                if (element.selectorText === "body") {
                    element.style.backgroundColor = "#181a1b";
                    element.style.color = "#b6b0a6";
                } else if (element.selectorText?.startsWith(".notifications")) {
                    element.style.background = changeColorBrightness(
                        element.style.background,
                        -180,
                    );
                } else if (element.selectorText?.startsWith(".notification")) {
                    element.style.background = changeColorBrightness(
                        element.style.background,
                        -200,
                    );
                    element.style.color = changeColorBrightness(
                        element.style.color,
                        60,
                    );
                }
            }

            for (const element of studentSheet.cssRules) {
                if (element.selectorText?.startsWith(".grade_")) {
                    const coeffMatch = element.cssText.match(/\d+/);
                    if (coeffMatch) {
                        const coeff = parseInt(coeffMatch[0]);
                        element.style.background = changeColorBrightness(
                            element.style.background,
                            (coeff - 8) * 10,
                        );
                    }
                }
            }

            if (switchSheet)
                for (const element of switchSheet.cssRules) {
                    if (
                        element.selectorText?.includes(
                            ".bootstrap-switch .bootstrap-switch",
                        )
                    ) {
                        element.style.background = changeColorBrightness(
                            element.style.background,
                            -100,
                        );
                    }
                }

            const toTopButton = document.querySelector("#to_top");
            toTopButton.addEventListener("mouseover", () => {
                toTopButton.style.backgroundColor = "#26292a";
            });

            toTopButton.addEventListener("mouseout", () => {
                toTopButton.style.backgroundColor = "";
            });
        };

        /**
         * Executes the necessary actions when the page is opened.
         */
        const onPageOpen = function () {
            updateGrades();
            processSchedule();

            changeGradeFieldsSizes();
            changeBodyWidth();
            setScheduleCSS();
            setDarkMode();
        };

        onPageOpen();
    } else if (document.URL.includes("orioks.miet.ru")) {
        const onPageOpen = function () {
            changeBodyWidth();
            setDarkMode();
        };

        const setDarkMode = function () {
            const sheets = Array.from(document.styleSheets);
            const bootstrapSheet = sheets.find((sheet) =>
                sheet.href?.includes("bootstrap.min.css"),
            );
            const orioksSheet = sheets.find((sheet) =>
                sheet.href?.includes("orioks.css"),
            );
            const indexSheet = sheets.find((sheet) =>
                sheet.href?.includes("index.css"),
            );
            const filePickerSheet = sheets.find((sheet) =>
                sheet.href?.includes("filePicker.css"),
            );
            const commentSheet = sheets.find((sheet) =>
                sheet.href?.includes("comment.css"),
            );
            const switchSheet = sheets.find((sheet) =>
                sheet.href?.includes("bootstrap-switch.min.css"),
            );
            const jquerySheet = sheets.find((sheet) =>
                sheet.href?.includes("jquery-ui.min.css"),
            );

            for (const element of bootstrapSheet.cssRules) {
                if (
                    [".well", ".breadcrumb"].some(
                        (elem) => element.selectorText === elem,
                    )
                ) {
                    element.style.backgroundColor = "#1b1d1e";
                    element.style.borderColor = "#363b3d";
                } else if (element.selectorText === ".breadcrumb > .active")
                    element.style.color = changeColorBrightness(
                        element.style.color,
                        70,
                    );
                else if (element.selectorText === ".table")
                    element.style.backgroundColor = "#181a1b";
                else if (
                    [
                        ".table > tbody > tr.active > td",
                        ".table-bordered > tbody > tr > td",
                    ].some((elem) => element.selectorText?.includes(elem))
                ) {
                    element.style.border = "1px solid #545b5e";
                    element.style.backgroundColor = "#181a1b";
                } else if (
                    [".label", ".navbar"].some((elem) =>
                        element.cssText.startsWith(elem),
                    ) &&
                    element.style
                )
                    element.style.backgroundColor = changeColorBrightness(
                        element.style.backgroundColor,
                        -40,
                    );
                else if (
                    ["li.active > a", "li > a:hover"].some(
                        (elem) =>
                            element.selectorText?.includes(elem) &&
                            element.style,
                    )
                )
                    element.style.backgroundColor = "#181a1b";
                else if (element.selectorText?.startsWith("a")) {
                    element.style.color = changeColorBrightness(
                        element.style.color,
                        60,
                    );

                    if (
                        element.selectorText.startsWith(
                            "a.list-group-item:hover",
                        )
                    )
                        element.style.backgroundColor = changeColorBrightness(
                            element.style.backgroundColor,
                            -200,
                        );
                } else if (element.selectorText === ".panel")
                    element.style.backgroundColor = "#1b1d1e";
                else if (
                    element.selectorText === ".panel-default > .panel-heading"
                )
                    element.style.backgroundColor = changeColorBrightness(
                        "#1b1d1e",
                        40,
                    );
                else if (element.selectorText === ".panel-default")
                    element.style.borderColor = "#363b3d";
                else if (element.selectorText?.startsWith(".panel-title > a"))
                    element.style.color = "#3cc8f6";
                else if (element.selectorText?.startsWith("select")) {
                    element.style.backgroundColor = "#1b1d1e";
                    element.style.borderColor = "#3e4446";
                    element.style.color = "#a29a8e";
                } else if (element.selectorText === ".list-group-item") {
                    element.style.backgroundColor = "#181a1b";
                    element.style.borderColor = "#545b5e";
                } else if (
                    [".btn-success", ".btn-primary", ".btn-danger"].some(
                        (elem) => element.selectorText === elem,
                    )
                )
                    for (const style of element.style)
                        element.style[style] = changeColorBrightness(
                            element.style[style],
                            -30,
                        );
                else if (
                    element.selectorText === ".table .table" ||
                    element.selectorText?.startsWith(
                        ".table-striped > tbody > tr:nth-child",
                    )
                )
                    element.style.backgroundColor = "#1b1d1e";
                else if (element.selectorText?.startsWith("button, ")) {
                    element.style.backgroundColor = changeColorBrightness(
                        element.style.backgroundColor,
                        -80,
                    );
                    element.style.borderColor = "#545b5e";
                } else if (element.selectorText === ".table > thead > tr > th")
                    element.style.borderBottom = "2px solid #545b5e";
            }

            for (const element of orioksSheet.cssRules) {
                if (element.selectorText === "body") {
                    element.style.backgroundColor = "#181a1b";
                    element.style.color = "#b6b0a6";
                } else if (element.selectorText?.startsWith(".notifications")) {
                    element.style.background = changeColorBrightness(
                        element.style.background,
                        -180,
                    );
                } else if (element.selectorText?.startsWith(".notification")) {
                    element.style.background = changeColorBrightness(
                        element.style.background,
                        -200,
                    );
                }
            }

            if (indexSheet) indexSheet.cssRules[0]["style"].color = "#3cc8f6";

            if (filePickerSheet)
                for (const element of filePickerSheet.cssRules) {
                    if (
                        [".resumable-drop", ".dragover"].some(
                            (elem) => element.selectorText === elem,
                        )
                    ) {
                        element.style.backgroundColor = "#181a1b";
                        element.style.borderColor = "#545b5e";
                    }
                }

            if (commentSheet)
                for (const element of commentSheet.cssRules) {
                    if (element.selectorText === ".media-body .author")
                        element.style.color = changeColorBrightness(
                            element.style.color,
                            200,
                        );
                    else if (element.selectorText === ".media-left .avatar")
                        element.style.color = changeColorBrightness(
                            element.style.color,
                            -30,
                        );
                }

            if (switchSheet)
                for (const element of switchSheet.cssRules) {
                    if (
                        element.selectorText?.includes(
                            ".bootstrap-switch .bootstrap-switch",
                        )
                    ) {
                        element.style.background = changeColorBrightness(
                            element.style.background,
                            -100,
                        );
                    }
                }

            const markUnreadButton = document.querySelector("a.avatar");
            if (markUnreadButton)
                markUnreadButton.style.background = "transparent";

            const commentsAvatars = document.querySelectorAll("div.avatar");
            commentsAvatars.forEach(
                (avatar) =>
                    (avatar.style.backgroundColor = changeColorBrightness(
                        avatar.style.backgroundColor,
                        -50,
                    )),
            );

            const dateInput = document.querySelector(
                "#portprojectfilter-file_date",
            );
            if (dateInput) {
                const interval = setInterval(() => {
                    if (document.querySelector("#ui-datepicker-div")) {
                        clearInterval(interval);
                        for (const element of jquerySheet.cssRules)
                            if (
                                [
                                    ".ui-widget-content",
                                    ".ui-widget-header",
                                ].some((elem) => element.selectorText === elem)
                            ) {
                                element.style.color = "#b6b0a6";
                                element.style.background = "#1b1d1e";
                                element.style.border = "1px solid #545b5e";
                            } else if (
                                element.selectorText?.startsWith(".ui-state-")
                            ) {
                                element.style.background =
                                    changeColorBrightness(
                                        element.style.background,
                                        -200,
                                    );
                                element.style.color = "#b6b0a6";
                                if (element.selectorText.includes("-highlight"))
                                    element.style.color = changeColorBrightness(
                                        element.style.color,
                                        -170,
                                    );
                                if (!element.selectorText.includes("-disabled"))
                                    element.style.border = "1px solid #545b5e";
                            }
                    }
                }, 100);
            }

            const toTopButton = document.querySelector("#to_top");
            toTopButton.addEventListener("mouseover", () => {
                toTopButton.style.backgroundColor = "#26292a";
            });

            toTopButton.addEventListener("mouseout", () => {
                toTopButton.style.backgroundColor = "";
            });
        };

        onPageOpen();
    }

    // CSS reload
    // document.querySelectorAll("link[rel=stylesheet]").forEach((link) => {
    //     if (
    //         ["bootstrap.min.css", "orioks.css", "student.css"].some((elem) =>
    //             link.href.includes(elem),
    //         )
    //     )
    //         link.href = link.href.replace(/\?.*|$/, "?" + Date.now());
    // });
})();
