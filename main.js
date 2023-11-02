// ==UserScript==
// @name         Better OriCOCKs
// @version      2.5.2
// @description  Изменение подсчёта баллов и местами дизайна, а также добавление/доработка расписания
// @source       https://github.com/Psychosoc1al/better-oricocks
// @author       Antonchik
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


(function () { //NOSONAR
        'use strict'; //NOSONAR


        /**
         * Changes the body width to make the interface wider and more readable.
         * Separate function for convenience to be used on different pages
         */
        const changeBodyWidth = function () {
            for (const sheet of document.styleSheets)
                if (sheet.href?.includes('https://orioks.miet.ru/libs/bootstrap/bootstrap.min.css')) {
                    for (const element of sheet.cssRules)
                        if (element.cssText.includes('1170px'))
                            element['cssRules'][0].style.width = '1330px';
                    return;
                }
        }


        /**
         * Save a key-value pair to the storage
         *
         * @param {string} key - The key to save
         * @param {string | Object} value - The value to save
         */
        const saveKeyValue = function (key, value) {
            // noinspection JSUnresolvedReference
            GM.setValue(key, value);
        }


        /**
         * Retrieves the value associated with the given key
         *
         * @param {string} key - The key to retrieve the value for
         * @return {Promise<string>} - The value associated with the given key
         */
        const loadValueByKey = function (key) {
            // noinspection JSUnresolvedReference,JSCheckFunctionSignatures
            return GM.getValue(key);
        }


        // check to know if we are on the page with grades
        if (document.URL.includes('student/student')) {
            const group = document.querySelector('select[name="student_id"] option[selected]').innerText.split(' ')[0];
            const weeksNumbers = {
                '1 числитель': 0,
                '1 знаменатель': 1,
                '2 числитель': 2,
                '2 знаменатель': 3
            };
            let scheduleTable;


            /**
             * Sends a request to the schedule server
             *
             * @param {string} [cookie=''] - The cookie to include in the request headers
             * @return {Promise<Object>} A promise that resolves with the response text
             */
            const sendRequest = function (cookie = '') {
                // noinspection JSUnresolvedReference,JSUnusedGlobalSymbols
                return GM.xmlHttpRequest({
                    url: 'https://miet.ru/schedule/data',
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded',
                        'Cookie': cookie
                    },
                    data: `group=${group}`,
                    onload: function (responsePromise) {
                        return responsePromise;
                    },
                    onerror: function (response) {
                        console.log(response);
                    }
                });
            };


            /**
             * Gets the schedule by sending a request and passing the protection(?) with setting the cookie
             *
             * @return {Promise<Object>} A JSON object containing the schedule
             */
            const getSchedule = function () {
                return sendRequest().then(responseObject => {
                    const cookie = responseObject.responseText.match(/wl=.*;path=\//);
                    if (cookie)
                        return sendRequest(cookie[0])
                            .then(responseObject => JSON.parse(responseObject.responseText));

                    return JSON.parse(responseObject.responseText);
                });
            };

            /**
             * Parses the schedule data received from the server
             *
             * @return {Promise<Array<Object>>} An array of parsed and formatted schedule elements
             */
            const parseSchedule = function () {
                return getSchedule().then(responseJSON => {
                    const parsedSchedule = [];
                    const regExp = RegExp(/\d{2}:\d{2}/);

                    for (const responseJSONElement of responseJSON['Data']) {
                        const scheduleElement = {}

                        scheduleElement['name'] = responseJSONElement['Class']['Name'];
                        scheduleElement['teacher'] = responseJSONElement['Class']['TeacherFull'];
                        scheduleElement['dayNumber'] = responseJSONElement['Day'];
                        scheduleElement['weekNumber'] = responseJSONElement['DayNumber'];
                        scheduleElement['room'] = responseJSONElement['Room']['Name'];
                        scheduleElement['lessonNumber'] = responseJSONElement['Time']['Time'];
                        scheduleElement['startTime'] = regExp.exec(new Date(responseJSONElement['Time']['TimeFrom']).toString())[0];
                        scheduleElement['endTime'] = regExp.exec(new Date(responseJSONElement['Time']['TimeTo']).toString())[0];

                        parsedSchedule.push(scheduleElement);
                    }
                    return parsedSchedule;
                })
            }


            /**
             * Updates the schedule and processes it
             */
            const processSchedule = function () {
                parseSchedule().then(parsedSchedule => {
                    saveKeyValue('schedule', parsedSchedule);
                })

                // TODO: schedule processing
            };


            /**
             * Adjusts a number to be integer if possible and rounded to at most 2 decimal places if not
             *
             * @param {number} number - The number to be adjusted
             * @return {string} The adjusted number as a string
             */
            const numberToFixedString = function (number) {
                if (!number)
                    return '0';

                let stringedNumber = number.toFixed(2);

                while (stringedNumber.endsWith('0'))
                    stringedNumber = stringedNumber.slice(0, -1);

                if (stringedNumber.endsWith('.'))
                    stringedNumber = stringedNumber.slice(0, -1);

                return stringedNumber
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
                const isCredit = controlForm === 'Зачёт';

                if (gradeRatio < 0.5) {
                    if (gradeRatio < 0.2)
                        return ['Незачтено', 1];
                    return ['Незачтено', 2];
                } else if (gradeRatio < 0.7)
                    return [isCredit ? 'Зачтено' : 'Удовлетворительно', 3];
                else if (gradeRatio < 0.86)
                    return [isCredit ? 'Зачтено' : 'Хорошо', 4];
                else
                    return [isCredit ? 'Зачтено' : 'Отлично', 5];

            }


            /**
             * Changes the size of numeric and string grade fields
             */
            const changeGradeFieldsSizes = function () {
                for (const sheet of document.styleSheets)
                    if (sheet.href?.includes('https://orioks.miet.ru/controller/student/student.css'))
                        for (const element of sheet.cssRules) {
                            if (element['selectorText'] === '.w46')
                                element['style'].width = '33px';
                            if (['.grade', '#bp'].includes(element['selectorText'])) {
                                element['style'].width = '45px';
                                element['style'].padding = '3px';
                            }
                        }
                document.querySelector('span[style="width: 60px"]').style.width = 'fit-content';
            };


            // to be changed or removed
            /**
             * Sets the schedule CSS and header.
             */
            const setScheduleCSSAndHeader = function () {
                if (!document.querySelector('.alert.ng-scope i'))
                    return;

                for (const sheet of document.styleSheets)
                    if (sheet.href?.includes('https://orioks.miet.ru/libs/bootstrap/bootstrap.min.css')) {
                        for (const element of sheet.cssRules)
                            if (element.cssText.startsWith('.alert {') && element.style['padding']) {
                                element.style['padding'] = '0';
                                element.style['margin-bottom'] = '0';
                            }
                        break;
                    }

                const scheduleTableBlank = document.createElement("table")
                scheduleTableBlank.innerHTML = `
                    <table>
                      <tr>
                        <th style="width: 20%">Номер</th>
                        <th>Предмет, преподаватель</th>
                        <th style="padding: 3px">Аудитория</th>
                        <th style="padding: 3px">Время</th>
                      </tr>
                    </table>`;

                const style = document.createElement('style');
                style.innerHTML = `
                    div.alert.ng-scope table,
                    div.alert.ng-scope table tr,
                    div.alert.ng-scope table th,
                    div.alert.ng-scope table td {
                      border: 1px solid black;
                      border-collapse: collapse;
                      width: 100%;
                      text-align: center;
                      padding: 5px;
                    }`;

                document.querySelector('.col-md-4 .well h4').style['margin-left'] = '5px'
                document.querySelectorAll('.col-md-4 .well')[1].style['padding-left'] = '5px';
                document.querySelectorAll('.col-md-4 .well')[1].style['padding-right'] = '5px';
                document.querySelector('.alert.ng-scope i').remove();
                document.querySelector('.alert.ng-scope').append(scheduleTableBlank, style);
                scheduleTable = document.querySelector('.alert.ng-scope tbody');
                setSchedule();
            }


            // to be changed or removed
            /**
             * Sets the schedule based on the current time and day or on finds the closest lessons.
             */
            const setSchedule = function () {
                const currentTime = RegExp(/\d{2}:\d{2}/).exec(
                    new Date().toLocaleTimeString('ru', {
                        timeZone: 'Europe/Moscow',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                )[0];
                let stringCurrentWeek = document.querySelector('.small').innerText.split('\n')[1];
                if (!stringCurrentWeek)
                    stringCurrentWeek = document.querySelector('.small').innerText.split(' ').slice(3).join(' ')
                let searchWeekNumber = weeksNumbers[stringCurrentWeek];
                let currentDayNumber = new Date().getDay();
                let searchDayNumber = currentDayNumber - 1;
                let closestLessons = [];

                if (typeof searchWeekNumber === 'undefined') {
                    setPreScheduleHeader(currentDayNumber, false);
                    return;
                }

                if (currentDayNumber === 0) {
                    searchWeekNumber = (searchWeekNumber + 1) % 4;
                    searchDayNumber = 0;
                }

                loadValueByKey('schedule').then(schedule => {
                    schedule = JSON.parse(JSON.stringify(schedule));

                    while (!closestLessons.length) {
                        searchDayNumber = (searchDayNumber + 1) % 7;
                        if (searchDayNumber === 0) {
                            searchWeekNumber = (searchWeekNumber + 1) % 4;
                            searchDayNumber = 1;
                        }

                        closestLessons = schedule.filter(lesson =>
                            lesson.dayNumber === searchDayNumber && lesson.weekNumber === searchWeekNumber &&
                            (currentDayNumber === searchDayNumber ? lesson.endTime >= currentTime : true) &&
                            !lesson.teacher.includes('УВЦ')
                        )
                    }

                    closestLessons.sort((a, b) => {
                        return (a.lessonNumber > b.lessonNumber) ? 1 : -1;
                    })

                    closestLessons.forEach(lesson => appendScheduleTableRow(lesson));
                    setPreScheduleHeader(searchDayNumber);
                })
            }


            // to be changed or removed
            /**
             * Sets the header for the pre-schedule based on the search day number.
             *
             * @param {number} searchDayNumber - The number of the search day.
             * @param {boolean} hasSchedule - Optional. Indicates if there is a schedule for week. Default is true.
             */
            const setPreScheduleHeader = function (searchDayNumber, hasSchedule = true) {
                const preScheduleHeader = document.querySelector('h4 b');
                if (!hasSchedule)
                    preScheduleHeader.innerText = 'Расписания не привезли';
                else
                    preScheduleHeader.innerText += ', ' +
                        new Date('2018-01-0' + searchDayNumber).toLocaleDateString('ru', {weekday: 'long'});
            }


            // to be changed or removed
            /**
             * Appends a new row to the schedule table with the details of the given lesson.
             *
             * @param {object} lesson - The lesson object containing the lesson details.
             */
            const appendScheduleTableRow = function (lesson) {
                const newRow = document.createElement('tr');
                let startTime = lesson.startTime.match(/\d{2}:\d{2}/)[0];
                let endTime = lesson.endTime.match(/\d{2}:\d{2}/)[0];
                if (startTime === "12:00")
                    startTime += "/30";
                if (endTime === "13:20")
                    endTime += "/50";

                newRow.innerHTML = `
                    <td style="width: 20%">${lesson.lessonNumber}</td>
                    <td>${lesson.name} <br/> ~ <br/> ${lesson.teacher}</td>
                    <td>${lesson.room}</td>
                    <td>${startTime} <br/>-<br/> ${endTime}</td>`;

                scheduleTable.appendChild(newRow);
            }


            /**
             * Updates the grade fields based on the newest data
             */
            const updateGrades = function () {
                const source = document.querySelector('#forang');
                const raw_data = source.textContent;
                const jsonData = JSON.parse(raw_data);
                const disciplines = jsonData['dises'];

                for (let i = 0; i < disciplines.length; i++) {
                    const controlPoints = disciplines[i]['segments'][0]['allKms'];
                    const grade = disciplines[i]['grade'];
                    const controlForm = disciplines[i]['formControl']['name'];
                    const maxPossibleSum = disciplines[i]['mvb'];
                    let sum = 0;

                    for (let j = 0; j < controlPoints.length; j++) {
                        const balls = controlPoints[j]['balls'][0];

                        if (balls && balls['ball'] > 0)
                            sum += balls['ball'];
                    }

                    grade['b'] = numberToFixedString(sum); // current ball
                    grade['p'] = numberToFixedString(sum / maxPossibleSum * 100); // current percentage
                    // [maximal grade ("из ..."), class attribute for coloring]
                    [grade['w'], grade['o']] = getGradeNameAndType(sum / maxPossibleSum, controlForm);
                }

                source.textContent = JSON.stringify(jsonData);
            }


            /**
             * Executes the necessary actions when the page is opened.
             */
            const onPageOpen = function () {
                updateGrades();
                processSchedule();

                changeGradeFieldsSizes();
                changeBodyWidth();
                setScheduleCSSAndHeader();
            };


            onPageOpen();
        } else if (document.URL.includes('orioks.miet.ru'))
            changeBodyWidth();
    }
)
();
