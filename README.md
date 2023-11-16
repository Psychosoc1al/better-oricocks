# Better OriCOCKs

[![built with Codeium](https://codeium.com/badges/main)](https://codeium.com)

Это небольшой проект, цель которого - попытаться починить ОРИОКС на стороне клиента.
В частности, тут фиксится подсчёт текущих баллов, немножко редактируются разного рода CSS-стили,
а также отображается/дорабатывается ближайшее расписание

---

### Инструкция по установке:

- Понадобится менеджер пользовательских скриптов, что-то вроде
  [Tampermonkey (рекомендуется)](https://tampermonkey.net/), [Violentmonkey](https://violentmonkey.github.io/)
  или [Greasemonkey](https://www.greasespot.net/), но в первом пункте всё равно предложат установить, сильно
  удобнее перейти прямо оттуда
    - Если есть Adguard, можно ставить прямо туда, см. далее

1. Cтавим скрипт по кнопке [с Greasy Fork (тык)](https://greasyfork.org/ru/scripts/476783-better-oricocks)
    1. Для установки в Adguard достаточно его запустить до перехода на страницу или обновить
       последнюю после запуска
    2. Если не хочется ставить в Adguard, а сайт упорно предлагает его открыть,
       полностью закрываем Adguard и перезаходим на сайт (не забывая потом включить обратно)
2. Переходим в ОРИОКС на вкладку "Обучение"
3. ???
4. PROFIT

---

#### FAQ/ЧаВо, но это ответы:

- Наконец-то больше не надо вручную прокликивать каждую дисциплину для подсчёта баллов,
  данные подтягиваются автоматически
- Меняется количество баллов на стандартной раскладке "балл", и, соответсвенно, проценты
  на "%", а на раскладке "сум" остаётся оригинальное количество, ну вдруг кому интересно
- Проценты больше 100 оставлены специально, так забавнее с точки зрения автора
- Расписание учитывает тип недели, день и время для отображения незакончившихся пар
  текущего дня или, при их отсутствии, ближайшего, их имеющего (в отличие от оригинального)
- Страница ОРИОКСа обновится один раз при первой установке скрипта, это необходимо для
  подгрузки расписания
- Расписание игнорирует занятия в УВЦ (он же военная кафедра), потому что ~~нормальных~~
  обычных людей это отвлекает, а кому надо, те и сами в курсе
- В расписание добавлены ФИО преподавателей, берутся со [страницы расписания](https://miet.ru/schedule),
  грубо говоря (на деле с того же сервера, откуда и данные для той страницы), так что могут
  не соответствовать действительности, но тут автор явно не виноват
