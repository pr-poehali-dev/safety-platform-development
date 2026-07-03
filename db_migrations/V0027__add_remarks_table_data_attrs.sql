UPDATE t_p5901577_safety_platform_deve.templates
SET content = replace(
  replace(
    replace(
      replace(
        replace(
          replace(
            content,
            '<table style="min-width: 125px;">',
            '<table style="min-width: 125px;" data-remarks-table="1">'
          ),
          '<th colspan="1" rowspan="1"><p>№ п/п</p></th>',
          '<th colspan="1" rowspan="1" data-col-key="num"><p>№ п/п</p></th>'
        ),
        '<th colspan="1" rowspan="1"><p>Место нарушения</p></th>',
        '<th colspan="1" rowspan="1" data-col-key="place"><p>Место нарушения</p></th>'
      ),
      '<th colspan="1" rowspan="1"><p>Описание нарушения / Фото (при наличии)</p></th>',
      '<th colspan="1" rowspan="1" data-col-key="description"><p>Описание нарушения / Фото (при наличии)</p></th>'
    ),
    '<th colspan="1" rowspan="1"><p>Нарушен пункт НПА/ЛНА</p></th>',
    '<th colspan="1" rowspan="1" data-col-key="normRef"><p>Нарушен пункт НПА/ЛНА</p></th>'
  ),
  '<th colspan="1" rowspan="1"><p>Срок устранения</p></th>',
  '<th colspan="1" rowspan="1" data-col-key="deadline"><p>Срок устранения</p></th>'
)
WHERE is_default = true;