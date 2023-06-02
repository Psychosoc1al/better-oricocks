// ==UserScript==
// @name         Нормальный подсчёт баллов
// @namespace    http://tampermonkey.net/
// @version      0.1
// @description  try to take over the world!
// @author       You
// @match        https://orioks.miet.ru/student/student
// @icon         https://www.google.com/s2/favicons?sz=64&domain=miet.ru
// @grant        GM_cookie
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_listValues
// @grant        GM_deleteValue
// ==/UserScript==

(function () {
        'use strict';

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


        function disciplineGradeSave(gradeSpan) {
            const disciplineRows = document.querySelectorAll('div[ng-class="class_h()"] tr.pointer.ng-scope');
            for (const row of disciplineRows)
                if (row.className === 'pointer ng-scope info') {
                    let name = row.querySelector('td.ng-binding').innerText;
                    name += ', ' + document.querySelector('option[selected="selected"]').innerText;
                    GM.setValue(name, gradeSpan.innerText + ':' + countNewGradeClass(row));
                    break;
                }
        }


        function disciplineGradeLoad() {
            const disciplineRows = document.querySelectorAll('div[ng-class="class_h()"] tr.pointer.ng-scope');
            const selectedTerm = document.querySelector('option[selected="selected"]').innerText;

            for (const row of disciplineRows) {
                let disciplineName = row.querySelector('td.ng-binding').innerText + ', ' + selectedTerm;
                let currentGrade = row.querySelector('td span.grade').innerText;

                GM.getValue(disciplineName).then((value) => {
                    if (parseFloat(currentGrade) <= parseFloat(value.split(':')[0])) {
                        row.querySelector('td span.grade').innerText = value.split(':')[0];
                        adjustGradeColor(row, parseInt(value.split(':')[1]))
                    }
                })
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
            const disciplineRows = document.querySelectorAll('tr.pointer.ng-scope.info');
            const sum = sumGrades();

            for (const row of disciplineRows) {
                const gradeSpan = row.querySelector('td span.grade');
                gradeSpan.innerText = adjustNumber(sum);
                observer.disconnect();
                adjustGradeColor(row);
                observer.observe(targetNode, config);
                disciplineGradeSave(gradeSpan);
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

            return newClass;
        }

        function adjustGradeColor(disciplineRow, newClass = 0) {
            const gradeClass = disciplineRow.querySelector('td span.grade').attributes.class;
            const namedGradeClass = document.querySelector('td.text-right span.grade').attributes.class;
            if (!newClass)
                newClass = countNewGradeClass(disciplineRow);

            gradeClass.nodeValue = gradeClass.nodeValue.replace(/\d/, newClass.toString());
            namedGradeClass.nodeValue = namedGradeClass.nodeValue.replace(/\d/, newClass.toString());
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
                gradeCell.lastChild.nodeValue = 'Незачтено';
                gradeCell.attributes.style.nodeValue = 'width: 75px';
            } else if (isOffset) {
                gradeCell.lastChild.nodeValue = 'Зачтено';
                gradeCell.attributes.style.nodeValue = 'width: 60px';
            } else if (gradeRatio < 0.7) {
                gradeCell.lastChild.nodeValue = 'Удовлетворительно';
                gradeCell.attributes.style.nodeValue = 'width: 135px';
            } else
                gradeCell.attributes.style.nodeValue = 'width: 65px';
        }


        function changeGradeFieldsSizes() {
            for (const sheet of document.styleSheets)
                if (sheet.href?.includes('https://orioks.miet.ru/controller/student/student.css')) {
                    for (let i = 0; i < sheet.cssRules.length; i++) {
                        if (['.w46', '.grade', '#bp'].includes(sheet.cssRules[i].selectorText)) {
                            let rule = {};
                            for (const prop in sheet.cssRules[i])
                                rule[prop] = sheet.cssRules[i][prop];
                            switch (sheet.cssRules[i].selectorText) {
                                case '.w46':
                                    rule.cssText = rule.cssText.replace('46px', '31px');
                                    break;
                                default:
                                    rule.cssText = rule.cssText.replace('40px', '45px');
                                    rule.cssText = rule.cssText.replace('padding: 2px', 'padding: 3px');
                                    break;
                            }
                            sheet.deleteRule(i)
                            sheet.insertRule(rule.cssText);
                        }
                    }
                    return;
                }
        }


        function setToSum() {
            const clickEvent = new MouseEvent("click");
            const elem = document.getElementById("bp");
            elem.dispatchEvent(clickEvent);
            elem.dispatchEvent(clickEvent);
        }


        function onPageOpen() {
            changeGradeFieldsSizes()
            disciplineGradeLoad()
        }


        setTimeout(setToSum, 1);
        setTimeout(onPageOpen, 10);
        setTimeout(() => observer.observe(targetNode, config), 50);
    }

)

//TODO: добавить пересчёт баллов в проценты и обычные баллы (отслеживание переключателя)
