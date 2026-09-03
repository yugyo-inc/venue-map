window.VENUE_MAP_DATA = {
  meta: {
    width: 2046,
    height: 1447,
    source: "1 Sep 2026 operations materials",
    venue: "THE LUIGANS Spa & Resort"
  },
  guest: {
    sep30: {
      date: "30 SEP · WED",
      title: "WORLD NOMAD CONFERENCE",
      subtitle: "Conference, sunset cruise and opening party",
      notice: "Use the Conference Entrance. The hotel lobby is not the event entrance.",
      route: [[676,666],[634,719],[400,520],[105,630],[1250,1035]],
      pins: [
        { key:"entrance", x:676, y:666, label:"Conference Entrance", detail:"Event entrance", kind:"access", side:"right" },
        { key:"registration", x:634, y:719, label:"Registration & Cloakroom", detail:"One check-in point for all guests", kind:"service", side:"left" },
        { key:"summit", x:400, y:520, label:"World Nomad Conference", detail:"The Grand Garden · 14:00–17:00", kind:"destination", side:"left" },
        { key:"cruise", x:105, y:630, label:"Sunset Cruise · Uminonakamichi Pier", detail:"Off map · depart 17:30 · follow event staff", kind:"access", side:"right" },
        { key:"party", x:1250, y:1035, label:"Opening Party", detail:"Gazebo + Seaside Deck / Poolside Terrace · 18:30–21:00", kind:"destination", side:"right" },
        { key:"coworking", x:1289, y:794, label:"Coworking / Open Lounge", detail:"Outdoor terrace by Pool Pool Pool · open to all participants", kind:"service", side:"right" },
        { key:"booths", x:900, y:730, label:"Sponsor Booths", detail:"Planned along the indoor-to-deck circulation · final footprint pending", kind:"service", side:"left", tbc:true },
        { key:"restrooms", listOnly:true, label:"Restrooms / Accessible Restroom", detail:"Available at the hotel; exact first-floor position pending venue confirmation", kind:"service", tbc:true },
        { key:"hotel", x:1299, y:417, label:"Hotel Entrance", detail:"Not used for this event", kind:"muted", side:"right" }
      ]
    },
    oct1: {
      date: "01 OCT · THU",
      title: "IKIGAI ACADEMY · DAY 1",
      subtitle: "Morning plenary, lunch and parallel workshops",
      notice: "After lunch, workshops run in Ballroom A, Ballroom B and Garden WS.",
      route: [[676,666],[634,719],[400,520],[675,953],[338,598]],
      pins: [
        { key:"entrance", x:676, y:666, label:"Conference Entrance", detail:"Event entrance", kind:"access", side:"right" },
        { key:"registration", x:634, y:719, label:"Registration & Cloakroom", detail:"Open from 08:45", kind:"service", side:"left" },
        { key:"main", x:400, y:520, label:"Morning Main Program", detail:"The Grand Garden", kind:"destination", side:"left" },
        { key:"ballroom-a", x:338, y:598, label:"Workshop Room · Ballroom A", detail:"Parallel sessions after lunch", kind:"destination", side:"left" },
        { key:"ballroom-b", x:460, y:578, label:"Workshop Room · Ballroom B", detail:"Parallel sessions after lunch", kind:"destination", side:"right" },
        { key:"garden-ws", x:338, y:445, label:"Garden WS", detail:"Outdoor workshop area", kind:"destination", side:"left" },
        { key:"lunch", x:675, y:953, label:"Lunch Buffet", detail:"The Grand Beach · 12:35–14:05", kind:"service", side:"right" },
        { key:"coworking", x:1289, y:794, label:"Coworking / Open Lounge", detail:"Outdoor terrace by Pool Pool Pool · open to all participants", kind:"service", side:"right" },
        { key:"booths", x:900, y:730, label:"Sponsor Booths", detail:"Planned along the indoor-to-deck circulation · final footprint pending", kind:"service", side:"right", tbc:true },
        { key:"restrooms", listOnly:true, label:"Restrooms / Accessible Restroom", detail:"Available at the hotel; exact first-floor position pending venue confirmation", kind:"service", tbc:true },
        { key:"hotel", x:1299, y:417, label:"Hotel Entrance", detail:"Not used for this event", kind:"muted", side:"right" }
      ]
    },
    oct2: {
      date: "02 OCT · FRI",
      title: "IKIGAI ACADEMY · DAY 2",
      subtitle: "Breakfast, workshops, lunch and sunset sessions",
      notice: "Check the live programme for your session room before moving.",
      route: [[676,666],[634,719],[400,520],[675,953],[460,578]],
      pins: [
        { key:"entrance", x:676, y:666, label:"Conference Entrance", detail:"Event entrance", kind:"access", side:"right" },
        { key:"registration", x:634, y:719, label:"Registration & Cloakroom", detail:"Open from 08:30", kind:"service", side:"left" },
        { key:"breakfast", x:400, y:520, label:"Breakfast Workshop", detail:"The Grand Garden · 09:00–10:00", kind:"destination", side:"left" },
        { key:"ballroom-a", x:338, y:598, label:"Workshop Room · Ballroom A", detail:"Parallel sessions", kind:"destination", side:"left" },
        { key:"ballroom-b", x:460, y:578, label:"Workshop Room · Ballroom B", detail:"Parallel sessions", kind:"destination", side:"right" },
        { key:"garden-ws", x:338, y:445, label:"Garden WS", detail:"Outdoor sessions · weather dependent", kind:"destination", side:"left" },
        { key:"lunch", x:675, y:953, label:"Lunch", detail:"The Grand Beach · 12:15–13:30", kind:"service", side:"right" },
        { key:"coworking", x:1289, y:794, label:"Coworking / Open Lounge", detail:"Outdoor terrace by Pool Pool Pool · open to all participants", kind:"service", side:"right" },
        { key:"booths", x:900, y:730, label:"Sponsor Booths", detail:"Planned along the indoor-to-deck circulation · final footprint pending", kind:"service", side:"right", tbc:true },
        { key:"restrooms", listOnly:true, label:"Restrooms / Accessible Restroom", detail:"Available at the hotel; exact first-floor position pending venue confirmation", kind:"service", tbc:true },
        { key:"hotel", x:1299, y:417, label:"Hotel Entrance", detail:"Not used for this event", kind:"muted", side:"right" }
      ]
    }
  }
};
