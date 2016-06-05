<?
/*
	PHP RESTful binding to Scalra
	
	NOTE: PHP cURL extension may be required, which can be installed via:
	
	$ sudo apt-get install curl libcurl3 libcurl3-dev php5-curl

	see for more details:
	http://www.php.net/manual/en/curl.installation.php
*/

// NOTE: $server_domain  must be defined
$server_domain = 'http://prod.scalra.com:37234';

// without using cURL
// ref: http://stackoverflow.com/questions/6213509/send-json-post-using-php
function PostJSON($url, $data) {
	
	$options = array(
  		'http' => array(
    	'method'  => 'POST',
    	'content' => json_encode( $data ),
    	'header'=>  "Content-Type: application/json\r\n" .
       		         "Accept: application/json\r\n"
    	)
	);

	$context  = stream_context_create( $options );
	$result = file_get_contents( $url, false, $context );
	$response = json_decode( $result );
	
	return $response;
}
	

// Method: POST, PUT, GET etc
// Data: array("param" => "value") ==> index.php?param=value
// ref: http://stackoverflow.com/questions/9802788/call-a-rest-api-in-php
function CallAPI($method, $url, $data = false)
{
    $curl = curl_init();

    switch ($method)
    {
        case "POST":
            curl_setopt($curl, CURLOPT_POST, 1);

            if ($data)
                curl_setopt($curl, CURLOPT_POSTFIELDS, $data);
            break;
        case "PUT":
            curl_setopt($curl, CURLOPT_PUT, 1);
            break;
        default:
            if ($data)
                $url = sprintf("%s?%s", $url, http_build_query($data));
    }

    // Optional Authentication:
    curl_setopt($curl, CURLOPT_HTTPAUTH, CURLAUTH_BASSR);
    curl_setopt($curl, CURLOPT_USERPWD, "username:password");

    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);

    return curl_exec($curl);
}

// setup server domain
function SR_SetRESTServer($domain) {
	global $server_domain;
	$server_domain = $domain;
}

// publish a message
// requires $server_domain be set
function SR_Publish($channel, $msg) {
	global $server_domain;
	
	$url = $server_domain . '/event/SR_PUBLISH';
	$data = array(
    	"channel" => $channel,
		"msg" => $msg
	);	
	$response = PostJSON($url, $data);
	return $response;
}

?>
