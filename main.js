// ==UserScript==
// @name         Better OriCOCKs
// @namespace    http://tampermonkey.net/
// @version      1.23
// @description  Изменение подсчёта баллов и местами дизайна
// @author       Antonchik
// @match        https://orioks.miet.ru/*
// @match        https://miet.ru/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=miet.ru
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_deleteValue
// ==/UserScript==

(function () { //NOSONAR
        try {
            'use strict'; //NOSONAR

            /**
             * Changes the body width based on the specified condition.
             */
            function changeBodyWidth() {
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
             * @param {string} value - the value to save
             */
            function saveKeyValue(key, value) {
                // noinspection JSUnresolvedReference
                GM.setValue(key, value);
            }

            function loadValueByKey(key) {
                // noinspection JSUnresolvedReference
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


                function saveDisciplineGrade(gradeSpan) {
                    const disciplineRows = document.querySelectorAll('div[ng-class="class_h()"] tr.pointer.ng-scope');
                    for (const row of disciplineRows)
                        if (row.className === 'pointer ng-scope info') {
                            let name = row.querySelector('td.ng-binding').innerText;
                            name += ', ' + document.querySelector('option[selected="selected"]').innerText;
                            saveKeyValue(name, gradeSpan.innerText);
                            break;
                        }
                }


                function saveGroup() {
                    const group = document.querySelector('select[name="student_id"] option[selected]').innerText.split(' ')[0];
                    saveKeyValue('group', group);
                }


                function loadDisciplineGrade() {
                    const disciplineRows = document.querySelectorAll('div[ng-class="class_h()"] tr.pointer.ng-scope');
                    const selectedTerm = document.querySelector('option[selected="selected"]').innerText;

                    for (const row of disciplineRows) {
                        const disciplineName = row.querySelector('td.ng-binding').innerText + ', ' + selectedTerm;
                        const currentGrade = row.querySelector('td span.grade').innerText;
                        const isDisciplineNew = row.querySelector('div.w46').innerText === '-';

                        loadValueByKey(disciplineName).then(value => {
                            if (!isDisciplineNew && currentGrade <= value)
                                row.querySelector('td span.grade').innerText = value;
                        });
                        adjustGradeColor(row)
                    }
                }


                function sumGrades() {
                    const gradesList = document.querySelectorAll('span.grade');
                    let sum = 0;

                    for (const grade of gradesList) {
                        const isInsideRestricted = (grade.closest('div[ng-class]') || grade.closest('tr[ng-class="class_l()"]')) !== null;
                        if (!isInsideRestricted) {
                            const gradeValue = parseFloat(grade.innerText);
                            if (!isNaN(gradeValue))
                                sum += gradeValue;
                        }
                    }

                    return sum;
                }


                function adjustNumber(number) {
                    number = number.toFixed(2)
                    while (number.slice(-1) === '0')
                        number = number.slice(0, -1)
                    if (number.slice(-1) === '.')
                        number = number.slice(0, -1)

                    return number
                }


                function updateDisciplineGrade() {
                    const isDisciplineNew = document.querySelector('div.w46').innerText === '-';
                    if (!isDisciplineNew) {
                        const disciplineRows = document.querySelectorAll('tr.pointer.ng-scope.info');
                        const sum = sumGrades();

                        for (const row of disciplineRows) {
                            const gradeSpan = row.querySelector('td span.grade');
                            gradeSpan.innerText = adjustNumber(sum);
                            observer.disconnect();
                            adjustGradeColor(row);
                            observer.observe(targetNode, config);
                            saveDisciplineGrade(gradeSpan);
                        }
                    }
                }

                function countNewGradeClass(disciplineRow) {
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
                }

                function adjustGradeColor(disciplineRow) {
                    const gradeClass = disciplineRow.querySelector('td span.grade').attributes['class'];
                    const namedGradeClass = document.querySelector('td.text-right span.grade').attributes['class'];
                    const newClass = countNewGradeClass(disciplineRow);

                    gradeClass.value = gradeClass.value.replace(/\d/, newClass);
                    namedGradeClass.value = namedGradeClass.value.replace(/\d/, newClass);
                }

                function getGradeRatio(disciplineRow) {
                    let currentGrade = disciplineRow.querySelector('td span.grade').innerText;
                    let maxGrade = disciplineRow.querySelector('td.mvb div').innerText.split(' ')[1];

                    return parseFloat(currentGrade) / parseFloat(maxGrade);
                }

                function correctGradeName(disciplineRow) {
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
                }


                function changeGradeFieldsSizes() {
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
                }


                function setToSum() {
                    const clickEvent = new MouseEvent('click');
                    const elem = document.getElementById('bp');
                    elem.dispatchEvent(clickEvent);
                    elem.dispatchEvent(clickEvent);
                }


                function onPageOpen() {
                    changeGradeFieldsSizes();
                    changeBodyWidth();
                    loadDisciplineGrade();
                    saveGroup();
                }


                setTimeout(setToSum, 1);
                setTimeout(onPageOpen, 10);
                setTimeout(() => observer.observe(targetNode, config), 50);
            } else if (document.URL.includes('orioks.miet.ru'))
                changeBodyWidth();
            else {
                async function parseSchedule() {
                    const group = await loadValueByKey('group');
                    const requestData = {
                        method: 'POST',
                        body: `group=${group}`,
                        headers: {
                            'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                        }
                    };

                    return fetch('https://miet.ru/schedule/data', requestData)
                        .then(response => response.text())
                        .then(text => JSON.parse(text))
                        .catch(error => console.error(error));
                }


                function saveSchedule() {
                    parseSchedule().then(schedule => saveKeyValue('schedule', schedule));
                }


                function onMietPageOpen() {
                    saveSchedule();
                    if (document.URL.endsWith('?better-oricocks'))
                        window.close();
                }


                (() => onMietPageOpen())();
            }
        } catch (e) {
            alert(e);
        }
    }
)
();
