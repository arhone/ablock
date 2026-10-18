/**
 * @author AlekseyArh
 * @link https://github.com/arhone/ablock
 *
 * Расширенный режим: браузер по умолчанию помнит только 250 загруженных файлов страницы,
 * на тяжёлых сайтах остальные не попадают в вес страницы. Увеличиваем запас.
 */
performance.setResourceTimingBufferSize(2000);
