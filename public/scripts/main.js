(function(){

	var LABELS = {
		"H323": "H.323",
		"PSTN": "Phone",
		"BlueJeansApp": "Carmel",
		"RoomSystem": "Room System",
		"Skinny": "Skinny"
	};

	var PRIMARY_ENDPOINTS = ['Skinny', 'RoomSystem', 'PSTN', 'Acid', 'Base'];
	var IGNORED_ENDPOINTS = ['Flash', 'Movie', 'Record', 'InterCallMediaCascade', 'Master', 'Slave', 'Stream', 'PartnerCascade', 'unknown'];
	var OTHER_ENDPOINTS   = ['Jabber', 'Google', 'Telepresence', 'Lync', 'InterCall', 'ISDN', 'Hangouts', 'Level3'];

	var currentMix = {};
	var containersEl = $('.containers');
	var boxSizeAdjuster = new BoxSizeAdjuster();

	setInterval(poll, 15*1000);
	poll();

	function poll(){
		$.get("/api/endpointmix", function(res){
			var participants = res.data.endpointsBreakup;

			//ignore endpoints like the Flash IVR
			participants = _.omit(participants, IGNORED_ENDPOINTS);

			//important endpoints like Skinny always appear, even if no one is using them
			_.defaults(participants, _.zipObject(PRIMARY_ENDPOINTS, array_fill_zero(PRIMARY_ENDPOINTS.length)));

			//combine unimportant endpoints like Jabber into the Other category
			participants.Other = _(participants)
				.pick(OTHER_ENDPOINTS)
				.reduce(function(prev, curr){ return prev + curr; }, 0);
			participants = _.omit(participants, OTHER_ENDPOINTS);

			participants.RoomSystem = _(participants)
				.pick(["H323", "SIP"])
				.reduce(function(prev, curr){ return prev + curr; }, 0);
			participants = _.omit(participants, ["H323", "SIP"]);

			participants.Carmel = participants.BlueJeansApp || 0;
			delete participants.BlueJeansApp;

			
/*			participants.Skinny += participants.WebRTC || 0;
			delete participants.WebRTC;

			participants.Skinny += participants.BlueJeansApp || 0;
			delete participants.BlueJeansApp;
*/

			renderPage(participants);
			// renderPage(_.extend(participants, {
			// 	Skinny: 1375,
			// 	Acid: 41,
			// 	Base: 10,
			// 	H323: 375,
			// 	PSTN: 500
			// }));
		});
	}

	function renderPage(counts){
		_.each(counts, function(count, key){
			var container = $('.container.'+key.toLowerCase());

			if(!container.length){
				container = $('<div>', { 'class': 'container '+key.toLowerCase() });
				$('.containers').append(container);
			}

			var oldSortedIndex = $('.containers .container').index(container);
			currentMix[key] = count;
			var sortedIndex = _(currentMix)
				.map(function(v, k){
					return { "key": k, "value": v };
				})
				.sortBy(function(item){
					return -1 * item.value;
				})
				.findIndex(function(item){
					return item.key == key;
				});

			if(sortedIndex !== oldSortedIndex){
				if(sortedIndex === 0){
					$('.containers').prepend(container);
				} else {
					$('.containers .container').eq(sortedIndex - 1).after(container);
				}
			}

			renderContainer(container, key, count);
		});

		boxSizeAdjuster.adjustBoxSize();

		currentMix = counts;
	}

	function renderContainer(container, key, count){
		var isFirstRender = container.is(':empty');
		var label = LABELS[key] || key;

		if(isFirstRender){
			$("<div>", { "class": "boxesContainer" })
				.appendTo(container);

			$("<div>", { "class": "info" })
				.append($("<span>", { "class": "count" }).append($("<span>")))
				.append($("<span>", {
					"class": "key",
					"text": label
				}))
				.appendTo(container);
		}

		var max = Math.max(count, parseInt(container.attr('data-count-max') || "0", 10));
		container.attr({
			'data-count'     : count,
			'data-count-max' : max,
			'title'          : label + ' maximum since page load:\n'+max+' concurrent connections'
		});

		var boxesContainer = $('.boxesContainer', container);

		var boxes = boxesContainer.children();
		var countDifference = count - boxes.size();

		var animationDuration = isFirstRender ? 0 : 2000;

		if(countDifference > 0){
			var i = countDifference;
			while(i--){
				var newBox = $('<div>', { 'class': 'box', 'css': { opacity: 0 }});
				boxesContainer.append(newBox);
				newBox.animate({
					opacity: 1
				}, {
					duration: animationDuration,
					complete: function(){
						$(this).css('opacity', '');
					}
				});
			}
		} else if(countDifference < 0) {
			boxes.slice(countDifference).animate({
				opacity: 0
			}, {
				duration: animationDuration,
				complete: function(){
					$(this).remove();
				}
			});
		}

		$('.info .count span', container).text(count);
	}

	function array_fill_zero(length){
		return Array.apply(null, Array(length)).map(Number.prototype.valueOf, 0);
	}

	function BoxSizeAdjuster(){}

	BoxSizeAdjuster.prototype.adjustBoxSize = function() {
		this.step(this.getNextStepSize(35), 0);
		while(this.getExtraHeight() < 0){
			console.log("extra height "+this.getExtraHeight()+", reducing size by 1");
			containersEl.css('font-size', _.parseInt(containersEl.css('font-size')) - 1);
		}
	};

	BoxSizeAdjuster.prototype.getExtraHeight = function() {
		return document.documentElement.clientHeight - document.documentElement.scrollHeight;
	};

	BoxSizeAdjuster.prototype.getNextStepSize = function(prevStepSize){
		var extraHeight = this.getExtraHeight();
		var nextStepSize;
		if(extraHeight < 0){
			nextStepSize = -1 * Math.abs(prevStepSize / 2);
		} else if(extraHeight > 17){
			nextStepSize = Math.abs(prevStepSize / 2);
		} else {
			nextStepSize = null; //no further adjustments
		}

		if(nextStepSize === null || Math.abs(nextStepSize) < 1){
			return null;
		} else {
			return nextStepSize;
		}
	};

	BoxSizeAdjuster.prototype.step = function(stepSize, iterations){
		var oldSize = _.parseInt(containersEl.css('font-size'));
		var newSize = oldSize + stepSize;

		if(iterations < 100 && newSize > 12 && newSize < 300){
			containersEl.css('font-size', newSize);
			console.log('box_size = '+newSize+'px');

			var nextStepSize = this.getNextStepSize(stepSize);
			if(nextStepSize === null){
				console.log("done");
			} else {
				this.step(nextStepSize, iterations+1);
			}
		}
	};

})();
