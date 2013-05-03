(function(){

	var LABELS = {
		"H323": "H.323",
		"PSTN": "Phone"
	};

	var currentMix = {};

	setInterval(poll, 15*1000);
	poll();

	function poll(){
		$.get("/api/endpointmix", function(res){
			var participants = res.data.participants;
			participants.Other = 
				(participants.Jabber       || 0) +
				(participants.TelePresence || 0) +
				(participants.Flash        || 0) +
				(participants.Lync         || 0);
			delete participants.Jabber;
			delete participants.Lync;
			delete participants.TelePresence;
			delete participants.Flash;

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

			container.data('count', count);

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
		if(isFirstRender){
			$("<div>", { "class": "boxesContainer" })
				.appendTo(container);

			$("<div>", { "class": "info" })
				.append($("<span>", { "class": "count" }).append($("<span>")))
				.append($("<span>", {
					"class": "key",
					"text": LABELS[key] || key
				}))
				.appendTo(container);
		}

		var boxesContainer = $('.boxesContainer', container);

		var boxes = boxesContainer.children();
		var countDifference = count - boxes.size();

		var animationDuration = isFirstRender ? 0 : 1000;

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
			})
		}

		$('.info .count span', container)
			.text(count);
	}

})();