/* ===================================================================
   Serene Touch — Customer Portal DEMO DATA  (multi-role)
   -------------------------------------------------------------------
   Sample data so you can see and feel the portal immediately. It links
   three roles together:

     • Customers          (people receiving service)
     • Technicians        (field staff who run the visits)
     • Appointments       (link a customer + a technician + a treatment)

   In production, replace this with real records from your backend that
   are filtered by who is signed in (a customer sees only their own
   appointment; a technician sees only their jobs; an admin sees all).

   Appointment dates are generated relative to "today" so the demo
   always looks current.
=================================================================== */
(function () {
  "use strict";

  var today = new Date();
  today.setHours(0, 0, 0, 0);
  function at(days, h, m) {
    var d = new Date(today);
    d.setDate(d.getDate() + days);
    d.setHours(h || 0, m || 0, 0, 0);
    return d.toISOString();
  }

  window.SERENE_PORTAL_DATA = {

    /* Demo sign-in accounts. Replace with real authentication later.
       Every account uses the password: demo123 */
    accounts: [
      { email: "demo@serenetouch.ca",  password: "demo123", role: "customer",   refId: "C1", name: "Jane Doe" },
      { email: "tech@serenetouch.ca",  password: "demo123", role: "technician", refId: "T1", name: "Marc Tremblay" },
      { email: "admin@serenetouch.ca", password: "demo123", role: "admin",      refId: "A1", name: "Operations Admin" }
    ],

    technicians: [
      { id: "T1", name: "Marc Tremblay", firstName: "Marc",  initials: "MT", phone: "438-555-0140" },
      { id: "T2", name: "Sofia Reyes",   firstName: "Sofia", initials: "SR", phone: "438-555-0162" }
    ],

    customers: [
      { id: "C1", name: "Jane Doe",      firstName: "Jane",   email: "jane@example.com",   phone: "438-555-0199", address: "123 Maple Street, Montréal, QC  H2X 1Y6",          plan: "Quarterly Protection Plan", memberSince: "2025-09-12" },
      { id: "C2", name: "Robert Chen",   firstName: "Robert", email: "robert@example.com", phone: "438-555-0118", address: "88 Rue Saint-Denis, Montréal, QC  H2X 3K6",         plan: "One-Time Treatment",        memberSince: "2026-05-20" },
      { id: "C3", name: "Maria Gomez",   firstName: "Maria",  email: "maria@example.com",  phone: "438-555-0177", address: "450 Avenue du Parc, Laval, QC  H7N 3R9",           plan: "Quarterly Protection Plan", memberSince: "2025-11-03" },
      { id: "C4", name: "Luc Bélanger",  firstName: "Luc",    email: "luc@example.com",    phone: "438-555-0133", address: "1200 Boul. René-Lévesque, Longueuil, QC  J4K 2T5", plan: "Annual Prevention Plan",    memberSince: "2026-01-15" }
    ],

    /* Each appointment links a customer + a technician + a treatment. */
    appointments: [
      {
        id: "A1", customerId: "C1", technicianId: "T1",
        pest: "Cockroaches", treatmentType: "Gel Bait + Crack & Crevice Treatment", targets: "kitchen and bathroom",
        start: at(5, 9, 0), end: at(5, 10, 30), status: "Scheduled",
        revisit: at(19, 9, 0), coverageEnds: at(95, 0, 0), reEntryHours: 4,
        notes: "Targeting the kitchen and bathroom. Please make sure the area under the sink is accessible."
      },
      {
        id: "A2", customerId: "C2", technicianId: "T1",
        pest: "Bed Bugs", treatmentType: "Biological Heat-Assisted Treatment", targets: "main bedroom",
        start: at(0, 14, 0), end: at(0, 16, 0), status: "Scheduled",
        revisit: at(14, 14, 0), coverageEnds: at(45, 0, 0), reEntryHours: 5,
        notes: "2nd-floor apartment. Customer requested a discreet, unmarked arrival."
      },
      {
        id: "A3", customerId: "C3", technicianId: "T2",
        pest: "Ants", treatmentType: "Perimeter Barrier Treatment", targets: "kitchen and exterior perimeter",
        start: at(2, 11, 0), end: at(2, 12, 0), status: "Scheduled",
        revisit: at(16, 11, 0), coverageEnds: at(92, 0, 0), reEntryHours: 2,
        notes: "Dog on the premises — owner will crate it during the visit."
      },
      {
        id: "A4", customerId: "C4", technicianId: null,
        pest: "Rodents (Mice & Rats)", treatmentType: "Removal + Entry-Point Sealing", targets: "basement and garage",
        start: at(3, 15, 0), end: at(3, 16, 30), status: "Unassigned",
        revisit: at(17, 15, 0), coverageEnds: at(365, 0, 0), reEntryHours: 0,
        notes: "Customer reported droppings in the garage. Needs a technician assigned."
      }
    ],

    /* Past visits, keyed by customer id. */
    history: {
      "C1": [
        { date: at(-83, 9, 0),  pest: "Cockroaches", treatmentType: "Initial Inspection + Gel Bait", technician: "Marc Tremblay", result: "Treatment applied to kitchen and bathroom. Monitoring stations placed." },
        { date: at(-180, 13, 0), pest: "Ants",        treatmentType: "Perimeter Barrier Treatment",   technician: "Sofia Reyes",   result: "Exterior perimeter treated. No further activity reported." }
      ],
      "C2": [],
      "C3": [
        { date: at(-90, 10, 0), pest: "Ants", treatmentType: "Perimeter Barrier Treatment", technician: "Sofia Reyes", result: "Treated kitchen and perimeter. Customer satisfied." }
      ],
      "C4": []
    },

    /* Preparation steps shown depend on the pest being treated. */
    prepByPest: {
      "Cockroaches": [
        "Empty kitchen and bathroom cabinets so we can treat cracks and corners.",
        "Wipe food debris and grease off counters, the stovetop, and the sink.",
        "Store food and pet food in sealed containers.",
        "Fix or report any leaks or standing water — roaches need moisture.",
        "Pick up pet food bowls the night before the visit."
      ],
      "Bed Bugs": [
        "Strip all bedding and wash it on the hottest setting, then seal it in bags.",
        "Vacuum mattresses, box springs, and floors; empty the vacuum outside.",
        "Pull beds and furniture a few inches away from the walls.",
        "Do NOT move items between rooms — this spreads the bugs.",
        "Bag and seal clutter from under the bed and the closet floor."
      ],
      "Ants": [
        "Wipe down counters, but leave any visible ant trails for us to treat.",
        "Store sugary and greasy foods in sealed containers.",
        "Wipe up standing water and fix dripping taps.",
        "Clear items away from along the baseboards where ants travel."
      ],
      "Rodents (Mice & Rats)": [
        "Clear clutter from floors, closets, and storage areas.",
        "Store food and pet food in metal or glass containers.",
        "Take out the garbage and keep bins tightly sealed.",
        "Note any holes, gaps, or droppings you've seen so we can target them."
      ]
    },

    generalPrep: [
      "Clear access to baseboards, corners, and under sinks.",
      "Cover or move fish tanks and turn off their air pumps.",
      "Remove or cover open food, dishes, and candles from counters.",
      "Plan to keep children and pets out of treated areas for a few hours after.",
      "Make sure someone 18+ is home, or arrange access for the technician.",
      "Open a few windows to ventilate once the treatment is done."
    ],

    aftercareByPest: {
      "Cockroaches": "It's completely normal to see roaches for 1–2 weeks after treatment — the bait actually draws them out before it works through the colony. Please don't spray store-bought insecticide: it repels roaches from the bait and undoes the treatment. Keep surfaces clean and let us know what you're seeing at your revisit.",
      "Bed Bugs": "You may still spot a few bed bugs for up to two weeks. Keep sleeping in your own bed — leaving the room actually makes them spread — and avoid moving items between rooms. We'll confirm full elimination at your follow-up visit.",
      "Ants": "A brief spike in ant activity right after treatment is a good sign — they're carrying the bait back to the nest. Avoid wiping treated trails for a few days so the bait can do its job.",
      "Rodents (Mice & Rats)": "Keep food sealed and clutter low while the treatment works. At your revisit we'll check and reset the stations and seal any new entry points we find."
    }
  };
})();
