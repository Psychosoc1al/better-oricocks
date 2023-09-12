// ==UserScript==
// @name         Better OriCOCKs
// @namespace    http://tampermonkey.net/
// @version      1.28
// @description  Изменение подсчёта баллов и местами дизайна
// @author       Antonchik
// @match        https://orioks.miet.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=miet.ru
// @downloadURL  https://raw.githubusercontent.com/Psychosoc1al/better-oricocks/master/main.js?token=GHSAT0AAAAAACG6HQA46RVVF6H2ZHTRY4UQZIAP3OA
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

                    loadValueByKey(disciplineName).then(value => {
                        if (!isDisciplineNew && currentGrade <= value)
                            row.querySelector('td span.grade').innerText = value;
                    }).then(() => adjustGradeColor(row));
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
             * Parses the schedule by sending a request to 'https://miet.ru/schedule/data'.
             *
             * @return {Promise<Object>} A promise that resolves with the response text.
             */
            const parseSchedule = function () {
                return sendRequest('https://miet.ru/schedule/data', 'POST')
                    .then(responseObject => {
                        const cookie = responseObject.responseText.match(/wl=.*;path=\//);
                        if (cookie)
                            return sendRequest('https://miet.ru/schedule/data', 'POST', cookie[0])
                                .then(responseObject => JSON.parse(responseObject.responseText));

                        return JSON.parse(responseObject.responseText);
                    });
            };


            const saveSchedule = function () {
                parseSchedule().then(responseJSON => {
                    console.log(responseJSON);
                    saveKeyValue('schedule', responseJSON);
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
                const isOffset = document.querySelector('div.list-group-item.ng-binding').innerText.includes('Зачёт');

                if (gradeRatio < 0.5) {
                    gradeCell.innerText = 'Незачтено';
                    gradeCell.style = 'width: 75px';
                } else if (isOffset) {
                    gradeCell.innerText = 'Зачтено';
                    gradeCell.style = 'width: 60px';
                } else if (gradeRatio < 0.7) {
                    gradeCell.innerText = 'Удовлетворительно';
                    gradeCell.style = 'width: 135px';
                } else
                    gradeCell.style = 'width: 65px';
            };


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


            /**
             * Executes the necessary actions when the page is opened.
             */
            const onPageOpen = function () {
                changeGradeFieldsSizes();
                changeBodyWidth();
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

