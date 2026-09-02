# goal

Create a support tool / site for the family trip to Sanakara

# docs

in docs/ we have the Yakushima 5-Day Sankara Itinerary.xlsx as the plan

# information

family trip (2 of us) to Sankara
The trip moving plan:
- 0903, starts from Naha (move to hotel near airport). live in Double Tree Shyri. will have to drive to Toyota shop for leaving the car for maintenance, and will pick it up on 0911, last day)
- 0904
    - 8:00~9:00: breakfast at hotel
    - 9:00~: to airport
    - ~12:10: Fukuoka
    - Move to Fukoka Hilton Hotel
- 0905
    - to airport
    - 13:50~15:00: arrive at Yakushima
- This part is as in the excel
- 0909
    - ~16:45: to Fukuoka again
    - (TO BE RESERVED): diner with 2 friends in local city
    - Live in Fukuoka Hilton Hotel
- 0910
    - 15:55~17:35: Back to naha
    - Live in Double Tree Akashibashi Hotel
- 0911
    - 13:00: back to Toyota Shop to pick up car

Hotel:
Utilize Hilton Honor Membership for reducing costs, live in Hilton hotel series

# enjoyables

Except what is planned, there are many unplanned time part or undecided details. May do flexibly.

# pain points

- A document is not easy to carry or read
- A document may have many pages, not easy to focus on one day or on the site
- Not easy to maintain or check on phones and tablets in journey
- Ideas, Links, Maps, Note checkings are difficult to be done quickly on the site and with sometimes one hand busy
- Difficult to decide things on the site when in no plan time period and without local knowledges

# target

A support method, (whether it is tool or site or any other shape) for using on the journey
Can quickly check schedules in one day
Can support investigations or recommendations on the way
Easy to check google maps, transportations, nearby enjoyables, may filter on one topic
Can help to use for agent chats if need more complex decisions through talking into agent tools

# need ideas

Recommend a support tool's shape for acheiving the goals
Can discuss the details

# update

~~~
Done — your trip companion is live: ⧉ https://claude.ai/code/artifact/52b50ec3-13d1-4b18-bf75-b0bb194602f2

Open it on your phone and add it to the home screen. It's private to you until you share it from the page's share menu.

What's in v1 — "Sankara Days"

- Plan tab — the full Sep 3–11 timeline (your moving plan merged with the Excel), one day at a time with a scrollable day strip. It auto-opens today (in JST) and pins a "Happening now / Up next" card. Every item shows English + Japanese names (白谷雲水峡, トローキの滝, ヤクスギランド…), a one-tap Google Maps link, transport, and a tick circle to mark it done — ticks sync between both your phones.
- Flags on open items — the Sep 8 free slot (⚑ to decide, with an "Ask Claude" button pre-filled with the constraints: car until 16:00, starting from Mugio), the Sep 9 friends' dinner (⚑ book needed), and flight times marked "confirm".
- Ideas tab — ~25 pre-researched spots across Yakushima / Fukuoka / Naha, filterable by Food, Onsen, Rainy day, ≤1 hour, Sunset, etc. Each has a map link and a practical note (e.g., Hirauchi sea onsen only works around low tide; teamLab Forest is 5 min from your Fukuoka Hilton).
- Ask tab — a built-in Claude chat that already knows your whole itinerary and the current JST time, with suggestion chips like "Fill the free slot on Sep 8".
- Notes tab — shared quick notes synced between the two of you.
- Info tab — hotels with phone numbers and maps, flight/car summary, a shared pre-trip checklist (typhoon watch, onsen towels, rain gear…), weather/typhoon/tide links, and a print view for the offline backup — save it as PDF or screenshots before heading into Yakushima's no-signal interior.

Two things to know

1. Because the app uses shared sync, the link only opens for people signed in under your Claude account/org. If your partner can't sign in, tell me and I'll publish a share-anywhere version (notes would then be per-device instead of synced). Everything degrades gracefully — no sync just means "local" shows in the header.
2. I used my best knowledge for hotel phone numbers and the ideas pool — glance at the ones you'll rely on (the map links make verification one tap).

Want any tweaks tonight — different ideas, a place you already have in mind for the Sep 8 slot or the friends' dinner, more checklist items? One message and I'll republish to the same URL.
~~~

- move any generated docs or artifact to this project folder for management
- use git managements
- add a map picture or any displayable shape for every day and the whole info, for that page's appropriate planning route, in a appropriate showing scale, for quickly understands the moving and positions planned. Can use multiple ones if needed for one page
- note: can edit, can check to be done, and defaultly hide checked notes.
- note: add tag: todo, buy, idea, later, other days, memo, etc.
- ideas: more, and if good, show positions on maps
- ask: give some recommendations for different days (select the date)

lite: for sharing. cannot use sharing db or claude?

add official site link for the items if exists
