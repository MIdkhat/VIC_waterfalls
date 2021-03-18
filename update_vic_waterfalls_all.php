<?php
ini_set('error_reporting', E_ALL);
ini_set('display_errors', 1);
ini_set('memory_limit', '512M'); // or you could use 1G
ini_set('max_execution_time', 600); //300 seconds = 5 minutes
require('simple_html_dom.php');

function utf8ize($d) {
    if (is_array($d)) {
        foreach ($d as $k => $v) {
            $d[$k] = utf8ize($v);
        }
    } else if (is_string ($d)) {
        return utf8_encode($d);
    }
    return $d;
}

function data2array($url){
    $context = stream_context_create(array(
        'http' => array(
            'header' => array('User-Agent: Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201'),
        ),
    ));
    $html = file_get_html($url, false, $context);
    $table = $html->find('table', 0);
    $table_object = array();
    $find = ['&#8595;', '↓ ', ' days'];
    $replace = ['0', '0', ''];
    foreach($table->find('tr') as $tr){
        $row = array();
        foreach($tr->find('td, th') as $cell){
            $value = str_ireplace($find, $replace, $cell->plaintext);
            array_push($row, $value);
        }       
        if($row[0] != 'Graph'){
            array_push($table_object, $row);
        }  
    }
    $output = array_slice($table_object, 0, 32);
    return utf8ize($output);
}

///// SET DATE AND DAYS
date_default_timezone_set('Australia/Sydney');
$days_back = 7;
$date = date('m/d/Y', strtotime('-1 day', strtotime(date('m/d/Y', time())))); //// yesterdays date
$year = (int)date('Y', time());
$month = (int)date('m', time());
$MONTH = date('M', time());
$day = (int)date('d', time());

///// GET OLD STATIONS FROM EXISTING JSON
$stations_old = json_decode(file_get_contents("./data/rain_stations.json"), true);
echo('old stations: '. count($stations_old) . '</br>');
// echo (json_encode($stations_old));

//// GET NEW STATIONS DATA
//// lots of processing of the text file
$context = stream_context_create(array(
    'http' => array(
        'header' => array('User-Agent: Mozilla/5.0 (Windows; U; Windows NT 6.1; rv:2.2) Gecko/20110201'),
    ),
));
$html = file_get_html('http://www.bom.gov.au/climate/data/lists_by_element/alphaVIC_136.txt', false, $context);
$stations_new = preg_split('/ ( N | Y | -------------- ) /', $html->plaintext); //// explode on the end of the line
$stations_new = array_slice($stations_new, 1, -1); //// remove non-station lines

$stations_new = array_filter($stations_new, function ($var) { //// filter stations open in current month/year
    $find = date('M', time()) . ' ' . date('Y', time());
    return (stripos($var, $find) == true); 
});
$stations_new = array_values($stations_new);
echo('new stations: '. count($stations_new) . '</br>');

//// CREATE ARRAY OF NEW STATIONS WITH ZERO RAIN VALUES
for ($i = 0; $i < count($stations_new); $i++) {
    $station = array_slice(array_filter(explode(" ", $stations_new[$i])), 0, -6); //// remove not important info
    $length = count($station);
    $stations_new[$i] = array("station" => $station[0],
        "name" => implode(' ', array_slice($station, 1, $length-3)), //// merge name
        "lat" => $station[$length-2],
        "lon" => $station[$length-1],
        "rain" => array()
    );
};
// echo (json_encode($stations_new));

//// REMOVE STATIONS FROM OLD STATIONS WHICH DON'T EXIST IN NEW (ONLY ON THE LAST DAY OF THE MONTH)
if(date("Y/m/d") == date("Y/m/t", strtotime(date("Y/m/d")))){
    $ids_new = array_column($stations_new, 'station');
    foreach ($stations_old as $key => $value) {
        if(!in_array($value['station'], $ids_new)) {
            unset($stations_old[$key]);
        };
    };
};

//// ADD NEW STATIONS FROM NEW
$ids_old = array_column($stations_old, 'station');
foreach ($stations_new as $key => $value) {
    if(!in_array($value['station'], $ids_old)) {
        array_push($stations_old, $value);
    };
};

$stations_combined = array_values($stations_old); ///// NEW ARRAY WITH OLD AND NEW STATIONS
// $stations_combined = array_slice($stations_combined, 0, 6); ////// REMOVE AFTER TESTING !!!!!!!!!!!!!!!!
// $stations_combined = array_slice($stations_old, 0, 6); ////// REMOVE AFTER TESTING !!!!!!!!!!!!!!!!
// echo (json_encode($stations_combined));
echo('combined stations: '. count($stations_combined) . '</br>');

//// GET RAIN DATA
for ($i = 0; $i < count($stations_combined); $i++) {
    $id = $stations_combined[$i]['station'];
    $url = "http://www.bom.gov.au/jsp/ncc/cdio/wData/wdata?p_nccObsCode=136&p_display_type=dailyDataFile&p_stn_num=" . $id . "&p_startYear=";
    $filename = 'data_'. $id . '_' . $year . '.csv';
    $data = data2array($url);
    //// WRITE DATA TO FILE FOR EACH STATION
    $raw_data = array();
    $fp = fopen('./data/csv/'. $filename, 'w'); 
    foreach ($data as $fields) { 
        fputcsv($fp, $fields); 
        array_push($raw_data, $fields);    
    };
    fclose($fp);

    //// WRITE RAIN DATA TO FILE WITH ALL STATIONS
    $raw_data = array_slice($raw_data, 1, 33); //// remove header and footer
    
    /////=====================================
    ///// ADD LAST 7 DAYS OF DATA
    ///// ONLY NEED TO RUN ONCE WHEN DATA IS EMPTY OR LOST
    $rain_range = array();
    for ($x = $days_back; $x > 0; $x--) {
        $DATE = strtotime('-'. $x .' day', strtotime(date('m/d/Y', time())));
        // echo('today '. date('m/d/Y') . '</br>');
        $dt = date('m/d/Y', $DATE); 
        // echo($x . ' ' . $dt . '</br>');
        $m = (int)date('m', $DATE);
        $d = (int)date('d', $DATE);
        // echo($id . ' ' . $d . ' ' . $m . ' ' . $raw_data[$d][$m] . '</br>');
        if($raw_data[$d-1][$m] == ""){
            $val = '0';
        } else {
            $val = strval(round($raw_data[$d-1][$m], 1)); 
        };
        array_push($rain_range, array('date' => $dt, 'value' => $val));
    };
    $stations_combined[$i]['rain'] = $rain_range;
    $sum = array_reduce($stations_combined[$i]['rain'], function($carry, $item) {
        $carry += $item['value'];
        return $carry;
    });
    $stations_combined[$i]['sum'] = $sum;
    $stations_combined[$i]['last date'] = end($stations_combined[$i]['rain'])['date'];
    /////=====================================
    // echo (json_encode($stations_combined[$i]));
};
// echo (json_encode($stations_combined));

//// SAVE CSV (used for JS)
$csv_out = array();
$headers = array("station", "name", "lat", "lon", "last date", "sum");
for ($i = 0; $i < count($stations_combined); $i++) {
    $csv_str = array();
    $dates = array();
    foreach ($headers as $h) {
        array_push($csv_str, $stations_combined[$i][$h]);
    };
    foreach ($stations_combined[$i]['rain'] as $r) {
        array_push($csv_str, $r['value']);
        array_push($dates, $r['date']);
    };
    array_push($csv_out, $csv_str);
};
$headers = array_merge($headers, $dates);
array_unshift($csv_out, $headers);

// echo (json_encode($csv_out));

$csv_file = fopen("./data/rain_stations.csv", 'w');
foreach($csv_out as $line){
    // echo(implode(',', $line));
    // echo('</br>');
    fputcsv($csv_file, $line);
};
fclose($csv_file);
echo(count($csv_out) - 1 . ' records saved to rain_stations.csv<br>');

/// WRITE JSON (used for adding more data)
$json_file = fopen('./data/rain_stations.json', 'w');
fwrite($json_file, json_encode($stations_combined));
fclose($json_file);
echo(count($stations_combined) . ' records saved to rain_stations.json<br>');
echo('Australian time: ' . date('m/d/Y h:i:s a', time()) . '<br>');

?>