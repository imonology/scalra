
//
//
//  icLocation.js
//
//  manages user list at different location/app
//

//
// each 'location' has a unique id, a unique location name
// each 'location' may have multiple 'apps' 
// each 'app' has a unique ID and a list of users currently at the app
//
// when lobby is initialized, a location is created and id obtained 
//

//-----------------------------------------
// define local variables
//
//-----------------------------------------
var l_svcname = '[Location]';

// locationID --> location info (contains app list)
var l_locations = {};

// appID -> app info (contains locationID, user list)
var l_apps = {};

// location english name --> location ID
var l_name2location = {};

// account -> appID mapping
var l_accounts = {};

//-----------------------------------------
// define local function
//
//-----------------------------------------

// create a new location record, given its names
var l_createLocation = function (eng_name, local_name) {

    var locID = UTIL.createUUID();
    
    var locObj = {
        // english name of the location
        ENGName: eng_name,

        // location name in local language
        LLName: local_name,

        // a list of apps at this location
        apps: {}
    };

    l_locations[locID] = locObj;
    l_name2location[eng_name] = locID;

    return locID;
}

//-----------------------------------------
// delete a given location (when no more apps belong to a location)
var l_delLocation = function (locationID) {

    if (l_locations.hasOwnProperty(locationID) === false) {
        LOG.error('locationID=' + locationID + ' not found.', 'delLocation');               
        return;
    }
    
    var loc_name = l_locations[locationID].ENGName;
     
    LOG.sys('delete Location: ' + locationID + '(' + loc_name + ')', 'delLocation');

    // check if there are still users within apps at this location
    // if so, it indicates an error
    var num_apps = Object.keys(l_locations[locationID].apps).length;
    if (num_apps > 0) 
        LOG.error(num_apps + ' apps still belong to location ['+ loc_name + ']', 'delLocation');
    
    // remove name to locationID mapping
    delete l_name2location[loc_name];

    // remove location object
    delete l_locations[locationID];
}

// get location ID, given app's English ID
// default location is lobby
// if apps exist, then corresponding locations will be added
exports.getLocationID = function (eng_name, local_name) {

    // check if location exists
    if (l_name2location.hasOwnProperty(eng_name) === true) 
        return l_name2location[eng_name];

    // create a new one
    return l_createLocation(eng_name, local_name);
}

// get location name from ID
exports.getLocationName = function (locationID) {

    // check if location exists
    if (l_locations.hasOwnProperty(locationID) === false) {
        LOG.error('locationID: ' + locationID + ' does not exist', 'getLocationName');
        return '';
    }
	return l_locations[locationID].ENGName;
}

// add a new app
var l_addApp = function (appID, locationID) {

    // check if location exists
    if (l_locations.hasOwnProperty(locationID) === false) {
        LOG.error('locationID: ' + locationID + ' does not exist', 'addApp');
        return;
    }

    // check if already exists, ignore action if already exists
    if (l_apps.hasOwnProperty(appID) === true) {
        LOG.error('appID: ' + appID + ' already exists', 'addApp');
        return;
    }

    // insert new app record for this location
    l_apps[appID] = {
        locationID: locationID,
        users: {}
    }

    // build mapping from location to app 
    // TODO: (needed? or can simplfiy?)
    l_locations[locationID].apps[appID] = l_apps[appID];    
}

// remove an existing app from a location
exports.delApp = function (appID) {

    // check if already exists, ignore action if already exists
    if (l_apps.hasOwnProperty(appID) === false) {
        LOG.warn('appID: ' + appID + ' does not exist, possibly the app did not register user count', 'SR.Location.delApp');
        return;
    }

    var locationID = l_apps[appID].locationID;

    // check if location exists
    if (l_locations.hasOwnProperty(locationID) === false) {
        LOG.error('locationID: ' + locationID + ' does not exist', 'SR.Location.delApp');
        return;
    }

    LOG.warn('deleting info for app : ' + appID + ' at location: ' + l_locations[locationID].ENGName , 'SR.Location.delApp');

    delete l_apps[appID];
    delete l_locations[locationID].apps[appID];

    // check if we need to remove location info (if all apps have gone)
    // TODO: it's probably not necessary to delete location info
    //       as it can be re-used later in future
    //       but cleaning it up might save some space (?) and avoids clutter
    if (Object.keys(l_locations[locationID].apps).length === 0)
        l_delLocation(locationID);
}

//-----------------------------------------
exports.setUser = function (account, locationID, appID) {
    
    /*
    for (var loc_id in l_locations) {
        LOG.sys('locationID: ' + loc_id + ' name: ' + l_locations[loc_id].ENGName, 'setUser');
    }
    */

    // check if location exists
    if (l_locations.hasOwnProperty(locationID) === false) {
        LOG.error('locationID: ' + locationID + ' not found.', 'setUser');
        return '';
    }

    var loc_name = l_locations[locationID].ENGName;
    LOG.warn('set [' + account + '] to location: ' + loc_name, 'setUser');

	// record previous location
    var prevLocationID = undefined;
	if (l_accounts.hasOwnProperty(account))
		prevLocationID = l_apps[l_accounts[account]].locationID;

    // remove user from previous location
    l_delUser(account);

    // check if appID is provided, if not, use 'default' as appID
    // NOTE: this can happen for lobby, where there's no app created
    // NOTE: we cannot use 'default' alone, as it's possible there are multiple locations with single app
    if (appID === undefined) {
        appID = loc_name + '_default';
        LOG.warn('creating new appID: ' + appID, 'setUser');
    }
    
    // check if app record exists, if not, create one
    if (l_apps.hasOwnProperty(appID) === false) {
        LOG.warn('adding new app for appID: ' + appID, 'setUser');
        l_addApp(appID, locationID);        
    }

    // error check
    if (l_apps[appID].locationID !== locationID) {
        LOG.error('appID: ' + appID + ' does not belong to location: ' + loc_name, 'setUser');
        return '';
    }

    // store user data to new location
    l_apps[appID].users[account] = true;

    // create account -> appID mapping
    l_accounts[account] = appID;

	// return previous locationID
	return prevLocationID;
}

//-----------------------------------------
var l_delUser = exports.delUser = function (account) {

    // check if user location info exists, and the location also exists
    if (l_accounts.hasOwnProperty(account) === false) {
        LOG.warn('no location record for user [' + account + ']', 'icLocation.delUser');
        return;
    }
    
    var appID = l_accounts[account];
    var locationID = l_apps[appID].locationID;

    var loc_name = l_locations[locationID].ENGName;

    // remove this user account from app record
    if (l_apps[appID].users.hasOwnProperty(account) === false)
        LOG.error('location: ' + loc_name + ' app: ' + appID + ' does not have user: ' + account , 'delUser');
    else
        delete l_apps[appID].users[account];
    
    // clear account to appID mapping
    delete l_accounts[account];
}

//-----------------------------------------
// get English name for a location, given the ID
exports.getLocationEngName = function (locationID) {
    if (l_locations.hasOwnProperty(locationID) === true)
    {
        return l_locations[locationID].ENGName;
    }
    else
    {
        LOG.error('locationID='+locationID+' not found.', 'getLocationEngName');
        return undefined;
    }
}

// get Local Name, given the ID
exports.getLocationLLName = function (locationID) {
    if (l_locations.hasOwnProperty(locationID)===true)
    {
        return l_locations[locationID].LLName;
    }
    else
    {
        LOG.error('locationID='+locationID+' not found.', 'getLocationLLName');
        return undefined;
    }
}

// get location ID, given English name
var l_lookupLocationID = exports.lookupLocationID = function (eng_name) {
    if (l_name2location.hasOwnProperty(eng_name) === false) {
        LOG.error('cannot find LocationID for [' + eng_name + ']' , 'lookupLocationID');
        return '';
    }        
    
    return l_name2location[eng_name];
}

// get the locationID for a given user account
var l_getUserLocationID = exports.getUserLocationID = function (account) {
    if (l_accounts.hasOwnProperty(account) === false)
        return undefined;

    var appID = l_accounts[account];

    if (l_apps.hasOwnProperty(appID) === false)
        return undefined;

    return l_apps[appID].locationID;
}

// get the current appID for a given user
exports.getUserAppID = function (account) {

    if (l_accounts.hasOwnProperty(account) === false)
        return undefined;
    else
        return l_accounts[account];
}

//-----------------------------------------
// get the user accounts for all users under this location
// NOTE: we need to combine users from all apps at this location
exports.getLocationUsers = function (locationID) {

    if (l_locations.hasOwnProperty(locationID) === false) {
        LOG.error('locationID='+locationID+' not found.', 'getLocationUsers');            
        return [];
    }

    var list = [];

    // go through each app at this location and store user list
    for (var appID in l_locations[locationID].apps) {
        var app = l_apps[appID];
        for (var account in app.users)
            list.push(account);
    }

    LOG.sys('returning ' + list.length + ' users at location: ' + l_locations[locationID].ENGName, 'getLocationUsers'); 
    return list; 
}

//-----------------------------------------
// get the user accounts for all users at this app
// NOTE: we need to combine users from all apps at this location
exports.getAppUsers = function (appID) {

    var list = [];

    if (l_apps.hasOwnProperty(appID) === true) {
        for (var account in l_apps[appID].users)
            list.push(account);
    }    
    else {
        LOG.warn('appID=' + appID + ' not found, possibly no users were registered at this location', 'SR.Location.getAppUsers');
	}

    return list;
}

//-----------------------------------------
// returns a list of locationID for all currently available locations
exports.getLocationList = function () {
    var list = [];

    for (var key in l_locations)
        list.push(key);
   
    return list;
}

// check if an account is at a particular location
exports.inLocation = function (account, loc_name) {
    return (l_getUserLocationID(account) === l_lookupLocationID(loc_name));    
}
