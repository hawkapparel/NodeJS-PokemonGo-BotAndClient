var MAP  = null;
var userMarker = null;
var pokemonMarker = null;
var directionsService = null;
var socket = null;
var SOCKETIO_URL = location.protocol + "//" + location.host;
var arrayMarkersPokemons = [];
var $listNearbyPokemons = $("#list-nearby-pokemons");
function init()
{
	// Setup socketIO
	socket = io(SOCKETIO_URL);
	socket.on('walkdone', function (data) {
		$("#text-walk").append("<span>WALKK FINISHED!</span>");
		$("#loading-pokeball").empty();
	});
	socket.on('locationchanged', function (data) {
		console.log("Location changed!", data);
		var latlng = new google.maps.LatLng(data.lat, data.lng);
    	userMarker.setPosition(latlng);

    	// save new location
    	localStorage.setItem("lng", data.lng);
		localStorage.setItem("lat", data.lat);
	});

	socket.on('wildpokemonfound', function (pokemon) {
		console.log("wild pokemon found!", pokemon);
		var logListPokemon = document.getElementsByClassName("log-list");
		if (logListPokemon.length >= 6){
			logListPokemon[0].remove();
		}

		$("#log").append("<div class='log-list'><img class='log-list-pokemon' src='"+ pokemon.img +"' style='width: 45px;' onclick='showHidePokemonOnMap("+ pokemon.Latitude +","+ pokemon.Longitude +",\""+ pokemon.name +"\",\""+ pokemon.img +"\")'> Wild " + pokemon.name + " found!</div>");

		var dataPokemonFound = [
			pokemon.name,
			pokemon.Latitude,
			pokemon.Longitude,
			pokemon.img
		];

		addPokemonsMarket(obj);
	});

	socket.on('pokemoncatchresult', function (pokemon) {
		console.log("pokemon catch result: ", pokemon);
		var logListPokemon = document.getElementsByClassName("log-list");
		if (logListPokemon.length >= 6){
			logListPokemon[0].remove();
		}	
		$("#log").append("<div class='log-list'><img class='log-list-pokemon' src='"+ pokemon.img +"' style='width: 45px;'> Wild " + pokemon.name + " catch result: " + pokemon.result + "</div>");
	});

	socket.on('pokestopfarmed', function (fort) {
		console.log("pokestop farmed: ", fort);
		var logListPokemon = document.getElementsByClassName("log-list");
		if (logListPokemon.length >= 6){
			logListPokemon[0].remove();
		}
		//$("#log").append("<br> <img src='/img/pokestop.png' style='width: 45px;'> PokeStop " + fort.FortId + "farmed! ");
		$("#log").append("<div class='log-list'><img class='log-list-pokemon'src='/img/img_pokestop.png' style='width: 45px;'> PokeStop farmed!</div>");
		getInventory();
	});

	socket.on('inventoryfull', function (fort) {
		console.log("pokestop farm FAIL! Inventory full!: ", fort);
		var logListPokemon = document.getElementsByClassName("log-list");
		if (logListPokemon.length >= 6){
			logListPokemon[0].remove();
		}
		$("#log").append("<div class='log-list'><i class='material-icons' style='color:red;'>mood_bad</i> PokeStop " + fort.FortId + " NOT farmed! Inventory full!</div>");
	});


	socket.on('catchonlychanged', onCatchOnlyChanged);

	socket.on('togglecatchpokemons', onToggleCatchPokemons);

	socket.on('farmingchanged', onFarmingChanged);
	
	socket.on('movementchanged', onMovementChanged);

	socket.on('pokeballchanged', onPokeballChanged);

	socket.on('speedchanged', onSpeedChanged);



	// restore pokemon whitelist from localstorage
	$( document ).ready(function() {
	    restorePokemonWhitelist();
	    getUserProfile();
	    getInventory();

	    $(document).ready(function() {
			$('select').material_select();
		});
	});
}

function initMap() {
	/*
	map = new google.maps.Map(document.getElementById('map'), {
	center: {lat: -34.397, lng: 150.644},
	zoom: 8
	});
	*/

	getLocation(function(pos){

        //Set Rosa Nauticca - Miraflores (latitud, longitud) -12.130723, -77.035704
        //Set Chorrillos -12.167799, -77.036742
        //Set La punta -12.071723, -77.168597
        //Set isla -12.081271, -77.209974
        //Set Parque Kennedy -12.118975, -77.029080
        //Set PUCP -12.069261, -77.079752
        //sET Parque el Olivar -12.100981, -77.034603
        //Parque de las aguas -12.071439, -77.034093
        //San francisco 37.797623, -122.396054
        //Nido de dratinis 37.810896, -122.410700
        //-12.072800, -77.161541
        //-12.020213, -77.084801
        /*
        Example
     	var lat = -12.118975;   
		var lng = -77.029080;
        */

     	var lat = pos.coords.latitude;   
		var lng = pos.coords.longitude;

		localStorage.setItem("lng", lng);
		localStorage.setItem("lat", lat);
		showMap(lat, lng);
	});
}

function getLocation(cb)
{
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(cb);
    } else {
        alert("Geolocation is not supported by this browser.");
    }
}

function showMap(lat, lng)
{
	MAP = new google.maps.Map(document.getElementById('map'), {
	  center: {lat: lat, lng: lng},
	  zoom: 19
	});
	// Add map events
	google.maps.event.addListener(MAP, 'click', function(evt) {
		
		deleteMarkers();
		var movementchanged = $("#movementChangeCheckbox:checked").val();
		console.log(movementchanged);
		var sure = confirm("Do you want to go?");
		if(sure)
		{
			$("#text-walk").empty();
			$("#list-nearby-pokemons").empty();
			$("#loading-pokeball").append("<img src='/img/pokeball.gif'>");
			var lat = evt.latLng.lat();
			console.log(lat);
			var lng = evt.latLng.lng();
			console.log(lng);
			
			var actlng = localStorage.getItem("lng");
			var actlat = localStorage.getItem("lat");
			var start = new google.maps.LatLng(actlat, actlng);
			var end = evt.latLng;

			if (movementchanged == undefined){//Si no esta chequeado movementDirect
				console.log("es igual a undefined");
				getRoute(start, end, function(points){//Usa el API de google para simular caminata
					console.log("COMO SON LOS POINTS");
					console.log(points);
					walkTo(points);
				});
			}else{
				//Si movementDirecta esta chequeado, se crea el objeto positions y se pasa como parametro
				//simulando coordenadas normales sin efecto de caminata
				var positions = [{lat: lat, 
					lng: lng, 
					distance: 0
				}];

				walkTo(positions);
			}

		}
	});
	userMarker = new google.maps.Marker({
		position: {lat: lat, lng: lng},
		label: "",
		map: MAP
	});
	directionsService = new google.maps.DirectionsService();
}

function getRoute(start, end, cb)
{
	var request = {
		origin:start,
		destination:end,
		travelMode: google.maps.TravelMode.WALKING
	};
	directionsService.route(request, function(response, status) {
		if (status == google.maps.DirectionsStatus.OK)
		{
			//console.log(status);

			//console.log(response);

			var steps = response.routes[0].legs[0].steps;
	        var points = [];
	        for(var i in steps)
	        {
	            var distance = steps[i].distance.value * 0.001; // meters to kilometers
	            var p = {
	                lat: steps[i].end_location.lat(),
	                lng: steps[i].end_location.lng(),
	                distance: distance
	            };
	            points.push(p);
	        }

			cb( points );
		}
	});
}

function walkTo(points)
{
	//$.post("/api/walk", function(res){});
	console.log("FUNCION walkTo del lado de front");
	console.log(points);
	socket.emit("walk", points);
	getNearbyPokemons();//Muestra los pokemones cerca del marker en el mapa
}

function getNearbyPokemons()
{
	console.log("ENTRO A getNearbyPokemons");
	var lng = localStorage.getItem("lng");
	var lat = localStorage.getItem("lat");

	$.get("/api/nearbypokemons/"+lng+"/"+lat, function(pokemons){
		//console.log("DATA DE POKEMONS");
		//console.log(pokemons);
		listOfNearbyPokemons(pokemons);
		/*
		for(var p in pokemons)
		{
			addPokemonToMap(pokemons[p].pokedexinfo.img, pokemons[p].pokedexinfo.name, pokemons[p].location.Longitude, pokemons[p].location.Latitude);
		}
		*/
	});
}

function listOfNearbyPokemons(res){

	$("#list-nearby-pokemons").empty();
	var i = 0;
	var pokemon = {};
	var quantityPokemon = 0;
    for (i = res.cells.length - 1; i >= 0; i--){
    	console.log("numero de iteracion: " + i);
		console.log("-----------------------------------------------");
        if(res.cells[i].NearbyPokemon.length > 0)
        {
        	console.log("entro al if de nearbypokemon");

        	for (var near = 0; near < res.cells[i].NearbyPokemon.length; near++) {
        		console.log("Numero de pokedex: "+ parseInt(res.cells[i].NearbyPokemon[near].PokedexNumber));
        		pokemon = pokemonlistlocal.pokemon[parseInt(res.cells[i].NearbyPokemon[near].PokedexNumber)-1];
        		console.log(pokemon);
        		$('<li><img src="' + pokemon.img + '"></li>').appendTo($listNearbyPokemons);
        	};


        };

    	if(res.cells[i].WildPokemon.length > 0){
    		console.log("entro al if del length");
    		quantityPokemon = res.cells[i].WildPokemon.length;
    		console.log(quantityPokemon);
    		for (var pok = 0; pok < quantityPokemon; pok++) {
    			//pokemon = pokemonlistlocal.pokemon[parseInt(res.cells[i].NearbyPokemon[0].PokedexNumber)-1];
    			var object = [
    				pokemonlistlocal.pokemon[parseInt(res.cells[i].WildPokemon[pok].pokemon.PokemonId)-1].name,
    				res.cells[i].WildPokemon[pok].Latitude,
    				res.cells[i].WildPokemon[pok].Longitude,
    				pokemonlistlocal.pokemon[parseInt(res.cells[i].WildPokemon[pok].pokemon.PokemonId)-1].img,
    				res.cells[i].WildPokemon[pok].TimeTillHiddenMs/60000
    			];
				
				addPokemonsMarket(object);
				
        		console.log(res.cells[i].WildPokemon[pok]);
        		console.log("Pokemon ID: " + res.cells[i].WildPokemon[pok].pokemon.PokemonId);
        		console.log("Tiempo en desaparecer(min): " + (res.cells[i].WildPokemon[pok].TimeTillHiddenMs/60000) );
        		console.log("Latitude: " + res.cells[i].WildPokemon[pok].Latitude );
        		console.log("Longitude: " + res.cells[i].WildPokemon[pok].Longitude );

    		};
    	};
    	console.log("END-----------------------------------------------");
    };
    console.log("status del arrayMarkersPokemons");
    console.log(arrayMarkersPokemons);
    addPokemonsMarket(arrayMarkersPokemons);
}

function login()
{	
	document.getElementById("loading").style.visibility = "visible";
	var lng = localStorage.getItem("lng");
	var lat = localStorage.getItem("lat");

	var userInfo = {
		username: $("#usernameTxt").val(),
		password: $("#passwordTxt").val()
	};

	$.post("/api/start/"+lng+"/"+lat, userInfo, function(res){
		console.log("RESPONSE DEL LOGIN");
		console.log(res);
		document.getElementById("loading").style.visibility = "hidden";
		$("#statusLogin").append("<span>Logged In DONE!</span>");
		listOfNearbyPokemons(res);
	});
}

function addPokemonsMarket(obj) {

	var myLatLng = new google.maps.LatLng(obj[1], obj[2]);
	var markerPokemon = new google.maps.Marker({
		position: myLatLng,
		title: obj[0],
		icon: obj[3],
		map: MAP
	});
	arrayMarkersPokemons.push(markerPokemon);
}

// Removes the markers from the map, but keeps them in the array.
function clearMarkers() {
  setMapOnAll(null);
}

// Deletes all markers in the array by removing references to them.
function deleteMarkers() {
  console.log("ENTROOOO ALLL DELETE  MARKERSSSSSSSSSS");
  clearMarkers();
  arrayMarkersPokemons = [];
}

function setMapOnAll(map) {
  for (var i = 0; i < arrayMarkersPokemons.length; i++) {
    arrayMarkersPokemons[i].setMap(MAP);
  }
}

//Funcion que no se usa
function getNearObjects()
{
	var lng = localStorage.getItem("lng");
	var lat = localStorage.getItem("lat");

	$.get("/api/nearobjects/"+lng+"/"+lat, function(objects){
		console.log(objects);
	});
}

function getNearPokeStops()
{
	$("#loading-pokeball").append("<img src='/img/pokeball.gif'>");
	var lng = localStorage.getItem("lng");
	var lat = localStorage.getItem("lat");

	$.get("/api/nearpokestops/"+lng+"/"+lat, function(objects){
		//console.log(objects);

		for(var i in objects)
		{
			var fort = objects[i];
			var mapMarker = new google.maps.Marker({
				position: {lat: fort.Latitude, lng: fort.Longitude},
				label: "PokeStop",
				title: "PokeStop",
				icon: "/img/img_pokestop.png",
				map: MAP
			});
		}
		$("#loading-pokeball").empty();
	});
}

//Funciona a arreglar
function showHidePokemonOnMap(lat, lng, name, img)
{
	console.log("entro a function showHidePokemonOnMap");
	pokemonMarker.setMap(null);
}

/*CHECBOXS*/
function toggleCatchPokemons()
{
	$("#loading-pokeball").append("<img src='/img/pokeball.gif'>");
	var toggle = $("#toggleCatchPokemonsCheckbox").is(":checked");
	socket.emit('togglecatchpokemons', toggle);
}

function onToggleCatchPokemons(toggle)
{
	$("#toggleCatchPokemonsCheckbox").prop('checked', toggle);
	$("#loading-pokeball").empty();
}


function catchOnlyChange()
{
	var pokemons = $("#catchOnlyTxt").val();
	localStorage.setItem("pokemonwhitelist", pokemons);
	socket.emit('catchonlychange', pokemons);
}

function onCatchOnlyChanged(pokemons)
{
	$("#catchOnlyTxt").val(pokemons);
}


function farmingChange()
{
	var toggle = $("#farmingChangeCheckbox").is(":checked");
	socket.emit('farmingchange', toggle);
}

function onFarmingChanged(toggle)
{
	$("#farmingChangeCheckbox").prop('checked', toggle);
}

function movementChange()
{
	var toggle = $("#movementChangeCheckbox").is(":checked");
	socket.emit('movementchange', toggle);
}

function onMovementChanged(toggle)
{
	$("#movementChangeCheckbox").prop('checked', toggle);
}

function restorePokemonWhitelist()
{
	var pokemons = localStorage.getItem("pokemonwhitelist");
	$("#catchOnlyTxt").val(pokemons);
}


function getInventory()
{
	$.get("/api/inventory", function(inventory){
		//console.log(inventory);

		var inventoryDiv = $("#inventory");
		inventoryDiv.html("");
		var totalUsedSpace = 0;
		for(var i in inventory)
		{
			var item = inventory[i];
			var count = item.count || 0;
			inventoryDiv.append("<p> "+item.name+": "+count+" <a href='#!' onclick='showDeleteItem(\""+item.name+"\",\""+item.item_id+"\")'><i class='material-icons' style='color:red'>delete</i></a> </p>");
			totalUsedSpace += count;
		}

		$("#inventoryUsedSpace").html(totalUsedSpace);
		$("#loading-pokeball").empty();
	});
}

function getUserProfile()
{
	$.get("/api/profile", function(profile){
		console.log("USER PROFILE INFORMATION");
		//console.log(profile);
		
		//if (profile != null || profile != "" || profile != undefined){
			var pokecoin = profile.currency[0].amount || 0;			
		//}


		$("#username").html(profile.username);
		$("#userlvl").html(profile.level);
		$("#stardust").html(profile.currency[1].amount);
		$("#pokecoin").html(pokecoin);
	});
}

function getAllUserInfo()
{
	$("#loading-pokeball").append("<img src='/img/pokeball.gif'>");
	getUserProfile();
	getInventory();
}

function deleteItem(id, count)
{
	$.post("/api/inventory/drop/"+id+"/"+count, function(data){
		//console.log(data);
		if(data.result == 1)
		{
			Materialize.toast('Item Deleted!', 4000);
		}
		else
		{
			Materialize.toast('Error deleting item!', 4000);
		}

		getInventory();
	});
}

function showDeleteItem(name, id)
{
	var count = prompt("How many '"+name+"' do you want to drop?", 0);
	deleteItem(id, count);
}

function pokeballChange()
{
	var type = $("#pokeballTypeSelector").val();
	socket.emit('pokeballchange', type);
}

function onPokeballChanged(type)
{
	$("#pokeballTypeSelector").val(type);
}

function changeSpeed()
{
	$("#loading-pokeball").append("<img src='/img/pokeball.gif'>");
	var value = $("#speedTxt").val();
	socket.emit('speedchange', value);
	$("#loading-pokeball").empty();
}

function onSpeedChanged(speed)
{
	$("#speedTxt").val(speed);
}

//No se usa
function updateLocation()
{
	getLocation(function(pos){
		var lng = pos.coords.longitude;
		var lat = pos.coords.latitude;

		localStorage.setItem("lng", lng);
		localStorage.setItem("lat", lat);
		showMap(lat, lng);
	});
}


init();

