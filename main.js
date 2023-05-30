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


    function disciplineGradeSave(gradeSpan) {
        const disciplineRows = document.querySelectorAll('div[ng-class="class_h()"] tr.pointer.ng-scope');
        for (const row of disciplineRows)
            if (row.className === 'pointer ng-scope info') {
                let name = row.querySelector('td.ng-binding').innerText;
                name += ', ' + document.querySelector('option[selected="selected"]').innerText;
                GM.setValue(name, gradeSpan.innerText);
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
                if (parseFloat(currentGrade) < parseFloat(value))
                    row.querySelector('td span.grade').innerText = value;
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
            if (gradeSpan) {
                gradeSpan.innerText = adjustNumber(sum);
                disciplineGradeSave(gradeSpan);
            }
        }
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
        } else if (isOffset){
            gradeCell.lastChild.nodeValue = 'Зачтено';
            gradeCell.attributes.style.nodeValue = 'width: 60px';
        } else if (gradeRatio < 0.7) {
            gradeCell.lastChild.nodeValue = 'Удовлетворительно';
            gradeCell.attributes.style.nodeValue = 'width: 135px';
        } else gradeCell.attributes.style.nodeValue = 'width: 65px';
    }


    function changeGradeFieldWidth() {
        for (const sheet of document.styleSheets)
            if (sheet.href?.includes('https://orioks.miet.ru/controller/student/student.css')) {
                for (let i = 0; i < sheet.cssRules.length; i++) {
                    if (['.grade', '#bp'].includes(sheet.cssRules[i].selectorText)) {
                        let rule = {};
                        for (const prop in sheet.cssRules[i])
                            rule[prop] = sheet.cssRules[i][prop];
                        rule.cssText = rule.cssText.replace('40px', '45px');
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


    function observeForChosenDiscipline() {
        const targetNode = document.querySelectorAll('table.table-hover')[0];
        const config = {subtree: true, attributeFilter: ['class']};
        const callback = function (mutationsList, observer) {
            const disciplineSelected = mutationsList[mutationsList[0].target.outerHTML.includes(' info') ? 0 : 1];
            if (disciplineSelected)
                correctGradeName(disciplineSelected.target);
            updateDisciplineGrade();
        };
        const observer = new MutationObserver(callback);
        observer.observe(targetNode, config);
    }


    function onPageOpen() {
        changeGradeFieldWidth()
        disciplineGradeLoad()
    }


    setTimeout(setToSum, 1);
    setTimeout(onPageOpen, 10);
    setTimeout(observeForChosenDiscipline, 50);
})();

//TODO: сделать для названия дисциплины и для количества баллов рамки поменьше, чтобы название влезало нормально

//TODO: сделать подкраску фона оценки в цвет обновлённых баллов

//TODO: подогнать размер фона для словесной интерпретации оценки