// ==UserScript==
// @name         Better OriCOCKs
// @version      2.5.9
// @description  Изменение подсчёта баллов и местами дизайна, а также добавление/доработка расписания
// @source       https://github.com/Psychosoc1al/better-oricocks
// @author       Antonchik
// @license      MIT
// @namespace    https://github.com/Psychosoc1al
// @match        https://orioks.miet.ru/*
// @icon         https://orioks.miet.ru/favicon.ico
// @run-at       document-body
// @connect      miet.ru
// @connect      worldtimeapi.org
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


            /**
             * Sends a request to the schedule server
             *
             * @param {string} url - The URL to send the request to
             * @param {string} method - The request method
             * @param {string} cookie - The cookie to include in the request headers
             * @return {Promise<Object>} A promise that resolves with the response text
             */
            const sendRequest = function (url, method, cookie = '') {
                // noinspection JSUnresolvedReference,JSUnusedGlobalSymbols
                return GM.xmlHttpRequest({
                    url: url,
                    method: method,
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
                return sendRequest('https://miet.ru/schedule/data', 'POST')
                    .then(responseObject => {
                        const cookie = responseObject.responseText.match(/wl=.*;path=\//);
                        if (cookie)
                            return sendRequest('https://miet.ru/schedule/data', 'POST', cookie[0])
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

                    for (const responseJSONElement of responseJSON['Data']) {
                        const scheduleElement = {}

                        scheduleElement['name'] = responseJSONElement['Class']['Name'];
                        scheduleElement['teacher'] = responseJSONElement['Class']['TeacherFull'];
                        scheduleElement['dayNumber'] = responseJSONElement['Day'];
                        scheduleElement['weekNumber'] = responseJSONElement['DayNumber'];
                        scheduleElement['room'] = responseJSONElement['Room']['Name'];
                        scheduleElement['lessonNumber'] = responseJSONElement['Time']['Time'];
                        scheduleElement['startTime'] = new Date(responseJSONElement['Time']['TimeFrom'])
                            .toLocaleTimeString('ru', {
                                hour: '2-digit',
                                minute: '2-digit'
                            });
                        scheduleElement['endTime'] = new Date(responseJSONElement['Time']['TimeTo'])
                            .toLocaleTimeString('ru', {
                                hour: '2-digit',
                                minute: '2-digit'
                            })

                        parsedSchedule.push(scheduleElement);
                    }

                    return parsedSchedule;
                })
            }


            /**
             * Updates the schedule and processes it
             */
            const processSchedule = function () {
                loadValueByKey('schedule').then(schedule => {
                    parseSchedule().then(parsedSchedule => {
                        saveKeyValue('schedule', parsedSchedule);
                        if (!schedule)
                            window.location.reload();
                    });

                    if (schedule) {
                        const parsedSchedule = JSON.parse(JSON.stringify(schedule));
                        getClosestLessons(parsedSchedule);
                        setSchedule();
                    }
                });
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
                        return ['Не зачтено', 1];
                    return ['Не зачтено', 2];
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
                    if (sheet.href?.includes('https://orioks.miet.ru/controller/student/student.css')) {
                        for (const element of sheet.cssRules) {
                            if (element['selectorText'] === '.w46')
                                element['style'].width = '34px';
                            if (['.grade', '#bp'].includes(element['selectorText'])) {
                                element['style'].width = '45px';
                                element['style'].padding = '3px';
                            }
                        }
                        break;
                    }
                document.querySelector('span[style="width: 60px"]').style.width = 'fit-content';
            };


            /**
             * Sets the schedule CSS.
             */
            const setScheduleCSS = function () {
                if (!document.querySelector('.alert.ng-scope i'))
                    return;

                for (const sheet of document.styleSheets)
                    if (sheet.href?.includes('https://orioks.miet.ru/libs/bootstrap/bootstrap.min.css')) {
                        for (const element of sheet.cssRules)
                            if (element.cssText.startsWith('.table') && element.style && element.style['margin-bottom']) {
                                element.style['margin-top'] = '5px'
                            }
                        break;
                    }

                document.querySelectorAll('tr[ng-repeat="c in data"] span')
                    .forEach(elem => elem.style['white-space'] = 'pre-line');
            }


            /**
             * Sets the schedule based on the current time and day or on finds the closest lessons
             *
             * @param {Object} schedule - The whole schedule object
             * @param {number} daysOffset - The offset in days from the current day to start search
             * @return {Object[]} The closest two days lessons list
             */
            const getClosestLessons = function (schedule, daysOffset = 0) {
                let currentTime, currentDayNumber;
                let date = new Date();

                if (daysOffset === 0) {
                    currentTime = date
                        .toLocaleTimeString('ru', {
                            timeZone: 'Europe/Moscow',
                            hour: '2-digit',
                            minute: '2-digit'
                        });
                    currentDayNumber = date.getDay();
                } else {
                    date.setDate(date.getDate() + daysOffset);

                    currentTime = '00:00';
                    currentDayNumber = date.getDay();
                }

                let stringCurrentWeek = document.querySelector('.small').innerText.split('\n')[1];
                if (!stringCurrentWeek)
                    stringCurrentWeek = document.querySelector('.small').innerText.split(' ').slice(3).join(' ')
                let searchWeekNumber = weeksNumbers[stringCurrentWeek];
                let searchDayNumber = currentDayNumber--;
                let closestLessons = [];
                let nextOffset = daysOffset;

                if (typeof searchWeekNumber === 'undefined')
                    return [];

                if (currentDayNumber === 0) {
                    searchWeekNumber = ++searchWeekNumber % 4;
                    searchDayNumber = 0;
                }

                while (!closestLessons.length) {
                    searchDayNumber = ++searchDayNumber % 7;
                    nextOffset++;
                    if (searchDayNumber === 0) {
                        searchWeekNumber = ++searchWeekNumber % 4;
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

                date = new Date();
                date.setDate(date.getDate() + nextOffset);
                const stringDate = date.toLocaleDateString('ru', {
                    weekday: 'long',
                    day: '2-digit',
                    month: '2-digit'
                })

                if (daysOffset === 0)
                    return [{
                        date: stringDate,
                        lessons: closestLessons
                    }].concat(getClosestLessons(schedule, nextOffset));
                return [{
                    date: stringDate,
                    lessons: closestLessons
                }];
            }


            /**
             * Updates the grade fields based on the newest data
             */
            const updateGrades = function () {
                const source = document.querySelector('#forang');
                const jsonData = JSON.parse(source.textContent);
                const disciplines = jsonData['dises'];

                for (const element of disciplines) {
                    const controlPoints = element['segments'][0]['allKms'];
                    const grade = element['grade'];
                    const controlForm = element['formControl']['name'];
                    const maxPossibleSum = element['mvb'];
                    let sum = 0;

                    for (const element of controlPoints) {
                        const balls = element['balls'][0];

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


            const setSchedule = function () {
                const source = document.querySelector('#forang');
                const jsonData = JSON.parse(source.textContent);
                const schedule = jsonData['schedule'];

                for (const element of schedule) {
                    element[0] = new Date().toLocaleString('ru', {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit'
                    })
                    element[1][0] = {
                        'name': `Конструирование программного обеспечения 
                        Фёдоров Александр Николаевич
                        `,
                        'type': 'qwe',
                        'location': 'asd',
                        'time': '09:11'
                    }
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
                setScheduleCSS();
            };


            onPageOpen();
        } else if (document.URL.includes('orioks.miet.ru'))
            changeBodyWidth();
    }
)
();
