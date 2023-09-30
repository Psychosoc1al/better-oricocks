// ==UserScript==
// @name         Better OriCOCKs
// @namespace    http://tampermonkey.net/
// @version      1.29.7
// @description  Изменение подсчёта баллов и местами дизайна
// @author       Antonchik
// @match        https://orioks.miet.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=miet.ru
// @updateURL    https://raw.githubusercontent.com/Psychosoc1al/better-oricocks/master/main.js
// @downloadURL  https://raw.githubusercontent.com/Psychosoc1al/better-oricocks/master/main.js
// @grant        GM_xmlhttpRequest
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==


(function () { //NOSONAR
        'use strict'; //NOSONAR


        /**
         * Changes the body width to make the interface wider.
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
         * Save a key-value pair in the storage.
         *
         * @param {string} key - the key to save
         * @param {string | Object} value - the value to save
         */
        const saveKeyValue = function (key, value) {
            // noinspection JSUnresolvedReference
            GM.setValue(key, value);
        }


        /**
         * Retrieves the value associated with the given key.
         *
         * @param {string} key - The key to retrieve the value for.
         * @return {Promise<string>} - The value associated with the given key.
         */
        const loadValueByKey = function (key) {
            // noinspection JSUnresolvedReference,JSCheckFunctionSignatures
            return GM.getValue(key);
        }


        if (document.URL.includes('student/student')) {
            const observer = new MutationObserver(
                (mutationsList) => {
                    const disciplineSelected = mutationsList[mutationsList[0].target.outerHTML.includes(' info') ? 0 : 1];
                    if (disciplineSelected)
                        correctGradeName(disciplineSelected.target);
                    updateDisciplineGrade();
                }
            )
            const targetNode = document.querySelectorAll('table.table-hover')[0];
            const config = {subtree: true, attributeFilter: ['class']};
            const weeksNumbers = {
                '1 числитель': 0,
                '1 знаменатель': 1,
                '2 числитель': 2,
                '2 знаменатель': 3
            };
            let scheduleTable;


            /**
             * Save the discipline grade.
             *
             * @param {Element} gradeSpan - the grade span element
             */
            const saveDisciplineGrade = function (gradeSpan) {
                const disciplineRow = document.querySelector('tr.pointer.ng-scope.info');
                let name = disciplineRow.querySelector('td.ng-binding').innerText;

                name += ', ' + document.querySelector('option[selected="selected"]').innerText;
                saveKeyValue(name, gradeSpan['innerText']);
            }


            /**
             * Saves the group value by extracting it from the selected option of a dropdown list.
             */
            const saveGroup = function () {
                const group = document.querySelector('select[name="student_id"] option[selected]').innerText.split(' ')[0];
                saveKeyValue('group', group);
            }


            /**
             * Load discipline grades from the DOM and update the current grade if it is lower than the stored value.
             */
            const loadDisciplinesGrades = function () {
                const disciplineRows = document.querySelectorAll('tr.pointer.ng-scope');
                const selectedTerm = document.querySelector('option[selected="selected"]').innerText;

                for (const row of disciplineRows) {
                    const disciplineName = row.querySelector('td.ng-binding').innerText + ', ' + selectedTerm;
                    const currentGrade = row.querySelector('td span.grade').innerText;
                    const isDisciplineNew = row.querySelector('div.w46').innerText === '-';

                    loadValueByKey(disciplineName)
                        .then(value => {
                            if (!isDisciplineNew && parseFloat(currentGrade) <= parseFloat(value))
                                row.querySelector('td span.grade').innerText = value;
                        })
                        .then(() => adjustGradeColor(row));
                }
            }


            /**
             * Sends a request to the specified URL using the given method and cookie.
             *
             * @param {string} url - The URL to send the request to.
             * @param {string} method - The HTTP method to use for the request.
             * @param {string} [cookie=''] - The cookie to include in the request headers.
             * @return {Promise<Object>} A promise that resolves with the response text.
             */
            const sendRequest = function (url, method, cookie = '') {
                return loadValueByKey('group').then(group => {
                    const headers = {};
                    let data = '';
                    if (url === 'https://miet.ru/schedule/data') {
                        headers['Content-Type'] = 'application/x-www-form-urlencoded';
                        headers['Cookie'] = cookie;
                        data = `group=${group}`;
                    }

                    // noinspection JSUnresolvedReference,JSUnusedGlobalSymbols
                    return GM.xmlHttpRequest({
                        url: url,
                        method: method,
                        headers: headers,
                        data: data,
                        onload: function (responsePromise) {
                            return responsePromise;
                        },
                        onerror: function (response) {
                            console.log(response);
                        }
                    });
                });
            };


            /**
             * Gets the schedule by sending a request to 'https://miet.ru/schedule/data'.
             *
             * @return {Promise<Object>} A promise that resolves with the response text.
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
             * Parses the schedule data received from the server.
             *
             * @return {Promise<Array<Object>>} An array of parsed schedule elements.
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


            const saveSchedule = function () {
                parseSchedule().then(parsedSchedule => {
                    console.log(parsedSchedule);
                    saveKeyValue('schedule', parsedSchedule);
                })
            };


            /**
             * Calculates the sum of all the grades in the grades list.
             *
             * @return {number} The sum of all the grades.
             */
            const sumGrades = function () {
                const gradesList = document.querySelectorAll('span.grade');
                let sum = 0;

                for (const grade of gradesList) {
                    const isInsideRestricted = (
                        grade.closest('div[ng-class]') || grade.closest('tr[ng-class="class_l()"]')
                    ) !== null;

                    if (!isInsideRestricted) {
                        const gradeValue = parseFloat(grade.innerText);
                        if (!isNaN(gradeValue))
                            sum += gradeValue;
                    }
                }

                return sum;
            };


            /**
             * Adjusts a number by removing trailing zeros and the decimal point if necessary.
             *
             * @param {number} number - The number to be adjusted.
             * @return {string} The adjusted number as a string.
             */
            const adjustNumber = function (number) {
                let stringedNumber = number.toFixed(2);

                while (stringedNumber.endsWith('0'))
                    stringedNumber = stringedNumber.slice(0, -1);

                if (stringedNumber.endsWith('.'))
                    stringedNumber = stringedNumber.slice(0, -1);

                return stringedNumber
            };


            /**
             * Updates the discipline grade.
             */
            const updateDisciplineGrade = function () {
                const disciplineRow = document.querySelector('tr.pointer.ng-scope.info');
                if (!disciplineRow)
                    return;
                const isDisciplineNew = disciplineRow.querySelector('div.w46').innerText === '-';

                if (!isDisciplineNew) {
                    const gradeSpan = disciplineRow.querySelector('td span.grade');
                    const sum = sumGrades();

                    gradeSpan.innerText = adjustNumber(sum);
                    observer.disconnect();
                    adjustGradeColor(disciplineRow);
                    observer.observe(targetNode, config);
                    saveDisciplineGrade(gradeSpan);
                }
            };


            /**
             * Calculates the new grade class based on the grade ratio.
             *
             * @param {Element} disciplineRow - The discipline row object.
             * @return {string} The new grade class as a string.
             */
            const countNewGradeClass = function (disciplineRow) {
                const gradeRatio = getGradeRatio(disciplineRow);
                let newClass;

                if (gradeRatio < 0.2)
                    newClass = 1
                else if (gradeRatio < 0.5)
                    newClass = 2
                else if (gradeRatio < 0.7)
                    newClass = 3
                else if (gradeRatio < 0.86)
                    newClass = 4
                else
                    newClass = 5

                return newClass.toString();
            };


            /**
             * Adjusts the color of the grade in a discipline row based on the grade ratio.
             *
             * @param {Element} disciplineRow - The discipline row element in the DOM.
             */
            const adjustGradeColor = function (disciplineRow) {
                const gradeClass = disciplineRow.querySelector('td span.grade').attributes['class'];
                const namedGradeClass = document.querySelector('td.text-right span.grade').attributes['class'];
                const newClass = countNewGradeClass(disciplineRow);

                gradeClass.value = gradeClass.value.replace(/\d/, newClass);
                namedGradeClass.value = namedGradeClass.value.replace(/\d/, newClass);
            };


            /**
             * Calculates the grade ratio for a given discipline row.
             *
             * @param {Element} disciplineRow - The discipline row element.
             * @return {number} The grade ratio.
             */
            const getGradeRatio = function (disciplineRow) {
                let currentGrade = disciplineRow.querySelector('td span.grade').innerText;
                let maxGrade = disciplineRow.querySelector('td.mvb div').innerText.split(' ')[1];

                return parseFloat(currentGrade) / parseFloat(maxGrade);
            };


            /**
             * Change written grade field sizes based on the grade ratio.
             *
             * @param {Element} disciplineRow - the discipline row object
             */
            const correctGradeName = function (disciplineRow) {
                const gradeCell = document.querySelector('td.text-right span.grade');
                const gradeRatio = getGradeRatio(disciplineRow);
                const isCredit = document.querySelector('div.list-group-item.ng-binding').innerText.includes('Зачёт');

                if (gradeRatio < 0.5) {
                    gradeCell.innerText = 'Незачтено';
                    gradeCell.style = 'width: 75px';
                } else if (isCredit) {
                    gradeCell.innerText = 'Зачтено';
                    gradeCell.style = 'width: 60px';
                } else if (gradeRatio < 0.7) {
                    gradeCell.innerText = 'Удовлетворительно';
                    gradeCell.style = 'width: 135px';
                } else if (gradeRatio < 0.86) {
                    gradeCell.innerText = 'Хорошо';
                    gradeCell.style = 'width: 65px';
                } else {
                    gradeCell.innerText = 'Отлично';
                    gradeCell.style = 'width: 65px';
                }
            }


            /**
             * Changes the size of grade fields.
             */
            const changeGradeFieldsSizes = function () {
                for (const sheet of document.styleSheets)
                    if (sheet.href?.includes('https://orioks.miet.ru/controller/student/student.css'))
                        for (const element of sheet.cssRules) {
                            if (element['selectorText'] === '.w46')
                                element['style'].width = '31px';
                            if (['.grade', '#bp'].includes(element['selectorText'])) {
                                element['style'].width = '45px';
                                element['style'].padding = '3px';
                            }
                        }
            };


            const setScheduleCSSAndHeader = function () {
                for (const sheet of document.styleSheets)
                    if (sheet.href?.includes('https://orioks.miet.ru/libs/bootstrap/bootstrap.min.css')) {
                        for (const element of sheet.cssRules)
                            if (element.cssText.startsWith('.alert {') && element.style['padding']) {
                                element.style['padding'] = 0;
                                element.style['margin-bottom'] = 0;
                            }
                        break;
                    }

                const scheduleTableBlank = document.createElement("table")
                scheduleTableBlank.innerHTML = `
                    <table>
                      <tr>
                        <th style="width: 20%">Номер</th>
                        <th>Предмет, преподаватель</th>
                        <th>Аудитория</th>
                        <th>Время</th>
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
                    }`;

                document.querySelector('.alert.ng-scope i').remove();
                document.querySelector('.alert.ng-scope').append(scheduleTableBlank, style);
                scheduleTable = document.querySelector('.alert.ng-scope tbody');
                setSchedule();
            }


            const setSchedule = function () {
                const currentTime = RegExp(/\d{2}:\d{2}/).exec(
                    new Date().toLocaleTimeString('ru', {
                        timeZone: 'Europe/Moscow',
                        hour: '2-digit',
                        minute: '2-digit'
                    })
                )[0];
                let currentWeekNumber = weeksNumbers[document.querySelector('.small').innerText.split('\n')[1]];
                let currentDayNumber = new Date().getDay();
                let searchDayNumber = currentDayNumber;
                let closestLessons = [];

                if (typeof currentWeekNumber === 'undefined') {
                    setPreScheduleHeader(currentWeekNumber, currentDayNumber);
                    return;
                }

                if (currentDayNumber === 0) {
                    currentWeekNumber = (currentWeekNumber + 1) % 4;
                    searchDayNumber = 1;
                }

                loadValueByKey('schedule').then(schedule => {
                    schedule = JSON.parse(JSON.stringify(schedule));

                    while (!closestLessons.length) {
                        closestLessons = schedule.filter(lesson =>
                            lesson.dayNumber === searchDayNumber && lesson.weekNumber === currentWeekNumber &&
                            (currentDayNumber === searchDayNumber ? lesson.endTime >= currentTime : 1)
                        )//.reverse();

                        searchDayNumber = (currentDayNumber + 1) % 7;
                        if (searchDayNumber === currentDayNumber) {
                            currentWeekNumber = (currentWeekNumber + 1) % 4;
                            searchDayNumber = 1;
                        }
                    }

                    closestLessons.forEach(lesson => appendScheduleTableRow(lesson));
                    setPreScheduleHeader(currentWeekNumber, searchDayNumber);
                })
            }


            const setPreScheduleHeader = function (currentWeekNumber, currentDayNumber) {
                const preScheduleHeader = document.querySelector('h4 b');
                if (!currentWeekNumber)
                    preScheduleHeader.innerText = 'Расписания не привезли';
                else
                    preScheduleHeader.innerText += ', ' +
                        new Date('2018-01-0' + currentDayNumber).toLocaleDateString('ru', {weekday: 'long'});
            }


            const appendScheduleTableRow = function (lesson) {
                const newRow = document.createElement('tr');
                newRow.innerHTML = `
                    <td style="width: 20%">${lesson.lessonNumber}</td>
                    <td>${lesson.name}<br/>${lesson.teacher}</td>
                    <td>${lesson.room}</td>
                    <td>${lesson.startTime.match(/\d{2}:\d{2}/)[0]} - 
                            ${lesson.endTime.match(/\d{2}:\d{2}/)[0]}</td>`;

                scheduleTable.appendChild(newRow);
            }


            /**
             * Executes the necessary actions when the page is opened.
             */
            const onPageOpen = function () {
                changeGradeFieldsSizes();
                changeBodyWidth();
                setScheduleCSSAndHeader();
                loadDisciplinesGrades();
                saveGroup();
            };


            setTimeout(saveSchedule, 1);
            setTimeout(onPageOpen, 10);
            setTimeout(() => observer.observe(targetNode, config), 50);
        } else if (document.URL.includes('orioks.miet.ru'))
            changeBodyWidth();
    }
)
();

