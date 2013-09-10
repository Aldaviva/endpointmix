(function(){

	var LABELS = {
		"H323": "H.323",
		"PSTN": "Phone"
	};

	var PRIMARY_ENDPOINTS = ['Skinny', 'H323', 'PSTN', 'Acid', 'Skype'];
	var IGNORED_ENDPOINTS = ['Flash', 'Movie'];
	var OTHER_ENDPOINTS   = ['Jabber', 'Google', 'Telepresence', 'SIP', 'Lync', 'InterCall', 'InterCallMediaCascade'];

	var currentMix = {};

	setInterval(poll, 15*1000);
	poll();

	function poll(){
		$.get("/api/endpointmix", function(res){
			var participants = res.data.participants;

			//ignore endpoints like the Flash IVR
			participants = _.omit(participants, IGNORED_ENDPOINTS);

			//important endpoints like Skinny always appear, even if no one is using them
			_.defaults(participants, _.zipObject(PRIMARY_ENDPOINTS, array_fill_zero(PRIMARY_ENDPOINTS.length)));

			//combine unimportant endpoints like Jabber into the Other category
			participants.Other = _(participants)
				.pick(OTHER_ENDPOINTS)
				.reduce(function(prev, curr){ return prev + curr; }, 0);
			participants = _.omit(participants, OTHER_ENDPOINTS);

			renderPage(participants);
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

		$('.info .count span', container)
			.text(count);
	}

	function array_fill_zero(length){
		return Array.apply(null, Array(length)).map(Number.prototype.valueOf, 0);
	}

})();
