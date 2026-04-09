export interface DocArticle {
  slug: string;
  sectionId: string;
  title: string;
  content: React.ReactNode;
}

export interface DocSection {
  id: string;
  title: string;
  articles: DocArticle[];
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="mb-4 leading-7 text-foreground">{children}</p>;
}
function H2({ children }: { children: React.ReactNode }) {
  return <h2 className="text-xl font-semibold mt-8 mb-3 text-foreground">{children}</h2>;
}
function H3({ children }: { children: React.ReactNode }) {
  return <h3 className="text-base font-semibold mt-6 mb-2 text-foreground">{children}</h3>;
}
function UL({ children }: { children: React.ReactNode }) {
  return <ul className="list-disc list-inside mb-4 space-y-1 text-foreground">{children}</ul>;
}
function LI({ children }: { children: React.ReactNode }) {
  return <li className="leading-7">{children}</li>;
}
function Code({ children }: { children: React.ReactNode }) {
  return <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono">{children}</code>;
}
function Pre({ children }: { children: React.ReactNode }) {
  return (
    <pre className="bg-muted rounded-md p-4 mb-4 overflow-x-auto text-sm font-mono leading-6">
      {children}
    </pre>
  );
}
function Callout({ type = "info", children }: { type?: "info" | "warning" | "tip"; children: React.ReactNode }) {
  const styles = {
    info: "bg-blue-50 border-blue-300 text-blue-900 dark:bg-blue-950 dark:border-blue-700 dark:text-blue-100",
    warning: "bg-yellow-50 border-yellow-300 text-yellow-900 dark:bg-yellow-950 dark:border-yellow-700 dark:text-yellow-100",
    tip: "bg-green-50 border-green-300 text-green-900 dark:bg-green-950 dark:border-green-700 dark:text-green-100",
  };
  const labels = { info: "Note", warning: "Warning", tip: "Tip" };
  return (
    <div className={`border rounded-md p-4 mb-4 ${styles[type]}`}>
      <span className="font-semibold">{labels[type]}: </span>{children}
    </div>
  );
}

const SECTIONS: DocSection[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    articles: [
      {
        slug: "create-account",
        sectionId: "getting-started",
        title: "Create an Account",
        content: (
          <>
            <P>NistaGPS requires an account to access the fleet tracking platform. Accounts are provisioned by your administrator or by contacting the NistaGPS support team. Self-registration is not available — this ensures your fleet data is always tied to a verified organisation.</P>
            <H2>What you need</H2>
            <UL>
              <LI>A mobile phone number registered with your organisation</LI>
              <LI>A temporary password provided by your administrator</LI>
              <LI>A modern web browser (Chrome, Firefox, Edge, or Safari)</LI>
            </UL>
            <H2>Logging in for the first time</H2>
            <P>Navigate to <Code>https://nistagps.com/login</Code> and enter your phone number and the temporary password provided to you. After a successful login you will be taken to the live tracking dashboard. We strongly recommend changing your password immediately via the <strong>Profile</strong> page.</P>
            <H2>Forgotten password</H2>
            <P>If you have lost access to your account, contact your fleet administrator or reach out to NistaGPS support at <Code>support@nistagps.com</Code>. Administrators can reset passwords from the Control Panel &rarr; User Management section.</P>
            <Callout type="tip">Bookmark the login page so your team can always find it quickly, especially when using NistaGPS on a mobile browser.</Callout>
          </>
        ),
      },
      {
        slug: "workspace-overview",
        sectionId: "getting-started",
        title: "Workspace Overview",
        content: (
          <>
            <P>The NistaGPS workspace is the primary interface you see after logging in. It is built around a live map that shows all your vehicles in real time, surrounded by panels and toolbars that give you access to every feature of the platform.</P>
            <H2>Main areas</H2>
            <UL>
              <LI><strong>Top panel</strong> — toolbar with search, user account menu, and notification icons</LI>
              <LI><strong>Left sidebar</strong> — object (vehicle) list, groups, and filters</LI>
              <LI><strong>Map canvas</strong> — live GPS positions, trails, geofences, and markers</LI>
              <LI><strong>Bottom panel</strong> — quick statistics, event log, and active alerts</LI>
            </UL>
            <H2>Switching sections</H2>
            <P>The main navigation sidebar gives you access to all platform modules: Tracking, Dashboard, History, Reports, Geofences, Routes, Places of Interest, Vehicles, and more. Click any module name to switch to it immediately.</P>
            <Callout type="info">The workspace layout is responsive. On smaller screens the sidebar collapses into a slide-out menu that you open with the hamburger icon in the top-left corner.</Callout>
          </>
        ),
      },
      {
        slug: "quick-start",
        sectionId: "getting-started",
        title: "Quick Start Guide",
        content: (
          <>
            <P>This guide will get your first vehicle showing on the live map in under 10 minutes. Follow each step in order.</P>
            <H2>Step 1 — Add your vehicle</H2>
            <P>Go to <strong>Vehicles</strong> in the sidebar and click <strong>Add Vehicle</strong>. Fill in the name, registration plate, and IMEI number from your GPS tracker device. Save the vehicle — it will immediately appear in the object list on the left.</P>
            <H2>Step 2 — Connect your GPS device</H2>
            <P>Power on your GPS tracker and configure it to send data to the NistaGPS server. The server address is <Code>34.133.128.65</Code> and the TCP port depends on your device protocol:</P>
            <UL>
              <LI>GT06 / Concox devices: port <Code>5023</Code></LI>
              <LI>Other protocols: see the Supported Devices page</LI>
            </UL>
            <H2>Step 3 — Verify live data</H2>
            <P>Return to the <strong>Tracking</strong> map. Within a few minutes your vehicle icon should appear at its current location. If the icon does not appear, check the device power, SIM card data, and APN settings. See the Troubleshooting guide for detailed diagnostics.</P>
            <H2>Step 4 — Set up alerts</H2>
            <P>Navigate to <strong>Alert Settings</strong> to configure speed alerts, geofence breach notifications, and ignition events. Alerts can be delivered via the in-app notification panel or by SMS.</P>
            <Callout type="tip">Your GPS device must have an active SIM card with a mobile data plan. NistaGPS does not provide SIM cards — check with your device supplier.</Callout>
          </>
        ),
      },
    ],
  },
  {
    id: "workspace",
    title: "Workspace",
    articles: [
      {
        slug: "top-panel",
        sectionId: "workspace",
        title: "Top Panel",
        content: (
          <>
            <P>The top panel runs across the top of the NistaGPS workspace and provides quick access to global search, notifications, and your user account settings.</P>
            <H2>Search bar</H2>
            <P>Type a vehicle name, driver name, or address into the search bar to quickly locate an asset on the map. The results appear in a dropdown and clicking one centres the map on that object.</P>
            <H2>Notification bell</H2>
            <P>The bell icon shows the count of unread alerts. Click it to open the notification panel, which lists recent events such as speeding violations, geofence breaches, and low battery warnings. Clicking an event navigates to the relevant location on the map.</P>
            <H2>User menu</H2>
            <P>Click your name or avatar in the top-right corner to open the user menu. From here you can visit your Profile, switch the application theme (light/dark), or log out. Administrators also see a link to the Control Panel from this menu.</P>
          </>
        ),
      },
      {
        slug: "side-panel",
        sectionId: "workspace",
        title: "Object List (Side Panel)",
        content: (
          <>
            <P>The side panel on the left side of the workspace contains the complete list of your vehicles (called <em>objects</em> in the platform). It is the primary way to select, filter, and interact with individual vehicles.</P>
            <H2>Object list</H2>
            <P>Each vehicle is shown with its name, current status (moving, stopped, ignition off), and the time of its last GPS update. Vehicles are colour-coded: green for moving, orange for idling, grey for offline.</P>
            <H2>Filtering</H2>
            <P>Use the filter bar above the list to search by vehicle name. You can also filter by group using the Group selector at the top of the panel. This is useful when you manage a large fleet with vehicles organised into departments or regions.</P>
            <H2>Selecting a vehicle</H2>
            <P>Click any vehicle in the list to select it. The map will pan to that vehicle and show its information card (speed, heading, last update time, address). Right-click for a context menu with options such as Show History, Add Geofence, and Send Command.</P>
            <Callout type="info">You can hold Shift and click to select multiple vehicles and compare them side by side on the map.</Callout>
          </>
        ),
      },
      {
        slug: "map-overview",
        sectionId: "workspace",
        title: "Map Canvas",
        content: (
          <>
            <P>The map canvas is the central element of the NistaGPS workspace. It renders live GPS positions, historical trails, geofences, POIs, and routes on an interactive tile map.</P>
            <H2>Navigation</H2>
            <P>Use the scroll wheel to zoom in and out. Click and drag to pan. The map supports touch gestures on mobile and tablet devices. The <strong>Fit all</strong> button (arrows icon) adjusts the zoom level to show all vehicles at once.</P>
            <H2>Map layers</H2>
            <P>NistaGPS supports multiple map tile providers. Switch between providers using the Layers icon in the bottom-right corner of the map. Available options include standard road maps, satellite imagery, and hybrid views.</P>
            <H2>Vehicle markers</H2>
            <P>Each vehicle is represented by an icon that shows its current heading (direction of travel). A colour ring around the icon indicates status: green (moving), orange (idling &gt;5 min), grey (offline &gt;1 hour). Click a marker to open its information popup.</P>
            <H2>Cluster mode</H2>
            <P>When many vehicles are close together, their markers merge into a cluster bubble showing the count. Zoom in or click the cluster to expand it and see individual vehicles.</P>
          </>
        ),
      },
      {
        slug: "bottom-panel",
        sectionId: "workspace",
        title: "Bottom Panel",
        content: (
          <>
            <P>The bottom panel displays a live summary of your fleet status and recent events. It can be expanded or collapsed using the arrow icon on its left edge.</P>
            <H2>Fleet summary</H2>
            <P>The top row of the bottom panel shows at-a-glance counts: total vehicles, vehicles currently moving, vehicles stopped (ignition on), and vehicles offline. These numbers update automatically as data arrives from the server.</P>
            <H2>Event log</H2>
            <P>Below the summary is a scrollable list of recent events in chronological order. Each row shows the event type, the vehicle name, and the timestamp. Click any event row to highlight that vehicle on the map and zoom to its location.</P>
            <H2>Active alerts</H2>
            <P>The alert tab within the bottom panel shows active alert conditions — events that have been triggered but not yet acknowledged. Click <strong>Acknowledge</strong> next to an alert to clear it from the active list.</P>
          </>
        ),
      },
      {
        slug: "user-account-panel",
        sectionId: "workspace",
        title: "User Account Panel",
        content: (
          <>
            <P>The user account panel is accessible from the avatar/name in the top-right corner. It lets you manage your personal settings without navigating away from the tracking map.</P>
            <H2>Profile settings</H2>
            <P>Click <strong>Profile</strong> to open your profile page. Here you can update your display name, change your password, and set your preferred language. Changes take effect immediately without requiring a logout.</P>
            <H2>Password change</H2>
            <P>Enter your current password followed by your new password (minimum 8 characters). Click <strong>Save</strong>. You will remain logged in — the new password is required on your next login.</P>
            <H2>Theme preference</H2>
            <P>Toggle between light mode and dark mode using the sun/moon icon in the top panel. Your preference is saved in your browser and remembered across sessions.</P>
            <Callout type="warning">Administrators cannot view your password. If you forget it, an administrator must reset it for you from the Control Panel.</Callout>
          </>
        ),
      },
    ],
  },
  {
    id: "control-panel",
    title: "Control Panel",
    articles: [
      {
        slug: "control-panel-overview",
        sectionId: "control-panel",
        title: "Control Panel Overview",
        content: (
          <>
            <P>The Control Panel is the administrative hub of NistaGPS. It is accessible only to users with the <strong>admin</strong> role. You can reach it via the top-right user menu or by navigating to <Code>/admin-settings</Code>.</P>
            <H2>Available sections</H2>
            <UL>
              <LI><strong>Server Settings</strong> — server name, timezone, and global defaults</LI>
              <LI><strong>User Management</strong> — create, edit, and deactivate user accounts</LI>
              <LI><strong>Billing</strong> — manage subscription plans and vehicle activation</LI>
              <LI><strong>Branding</strong> — company logo, colour scheme, and custom domain</LI>
              <LI><strong>Maps</strong> — configure default map tile provider and API keys</LI>
              <LI><strong>Email &amp; SMS</strong> — SMTP and SMS gateway settings for alert delivery</LI>
              <LI><strong>API Access</strong> — generate and revoke API keys for third-party integrations</LI>
              <LI><strong>Logs</strong> — audit trail of admin actions and system events</LI>
            </UL>
            <Callout type="warning">Changes made in the Control Panel affect all users in your organisation. Always review changes carefully before saving.</Callout>
          </>
        ),
      },
      {
        slug: "server-settings",
        sectionId: "control-panel",
        title: "Server Settings",
        content: (
          <>
            <P>Server settings control the global configuration of your NistaGPS instance, including the server name shown to users, default timezone, and data retention policies.</P>
            <H2>Server name</H2>
            <P>The server name appears in the browser title bar, email notifications, and exported reports. Set it to your company name or fleet name for a professional appearance.</P>
            <H2>Timezone</H2>
            <P>All timestamps in the application — GPS events, reports, history — are displayed in the timezone set here. Choose the timezone that matches your primary fleet operations region. Users can override this individually from their Profile page.</P>
            <H2>Data retention</H2>
            <P>By default, GPS location history is stored for 90 days. Contact NistaGPS support to discuss extended retention options for compliance or regulatory requirements.</P>
          </>
        ),
      },
      {
        slug: "user-management",
        sectionId: "control-panel",
        title: "User Management",
        content: (
          <>
            <P>User Management lets administrators create accounts for fleet operators, dispatchers, and viewers. Each account has a role and a configurable set of module permissions.</P>
            <H2>Creating a user</H2>
            <P>Click <strong>Add User</strong> and fill in the phone number, display name, and temporary password. Select the user role:</P>
            <UL>
              <LI><strong>Admin</strong> — full access to all modules and the Control Panel</LI>
              <LI><strong>Manager</strong> — access to all tracking modules but not the Control Panel</LI>
              <LI><strong>Viewer</strong> — read-only access; cannot change vehicle settings or send commands</LI>
            </UL>
            <H2>Module permissions</H2>
            <P>For Manager and Viewer roles, you can restrict which modules are visible in the sidebar. Un-check modules that the user should not access. The vehicle list is always visible for all roles.</P>
            <H2>Deactivating a user</H2>
            <P>Deactivated users cannot log in but their account data is preserved. This is preferable to deletion when an employee leaves but you may need to audit their historical activity.</P>
          </>
        ),
      },
      {
        slug: "billing-setup",
        sectionId: "control-panel",
        title: "Billing & Subscriptions",
        content: (
          <>
            <P>NistaGPS billing is vehicle-based — you pay per activated vehicle per billing cycle. The Billing section in the Control Panel shows your current plan, active vehicle count, and payment history.</P>
            <H2>Activating a vehicle</H2>
            <P>Newly added vehicles are inactive by default. To activate a vehicle, go to <strong>Billing &rarr; Activate Vehicles</strong>, select the vehicles you want to add to your subscription, and complete the payment via Razorpay. Activated vehicles count towards your monthly bill from that day.</P>
            <H2>Subscription plans</H2>
            <UL>
              <LI><strong>Basic</strong> — live tracking, 30-day history, standard alerts</LI>
              <LI><strong>Standard</strong> — everything in Basic plus reports, driver management, and 90-day history</LI>
              <LI><strong>Premium</strong> — everything in Standard plus advanced analytics, API access, and 1-year history</LI>
            </UL>
            <H2>Invoices</H2>
            <P>Invoices are automatically generated at the end of each billing period and emailed to the admin account. Download them from <strong>Billing &rarr; Invoice History</strong> for accounting purposes.</P>
            <Callout type="info">Vehicle activation is prorated — if you activate mid-month, you only pay for the remaining days in the billing cycle.</Callout>
          </>
        ),
      },
      {
        slug: "branding",
        sectionId: "control-panel",
        title: "Branding",
        content: (
          <>
            <P>The Branding section lets you customise the visual identity of your NistaGPS instance to match your company branding. Changes apply to all users in your organisation.</P>
            <H2>Logo</H2>
            <P>Upload a PNG or SVG logo (recommended: 200×50 px, transparent background). The logo appears in the top-left corner of the application and in exported PDF reports.</P>
            <H2>Colour scheme</H2>
            <P>Set a primary brand colour. This colour is used for buttons, active states, and accents throughout the interface. The colour is applied automatically in both light and dark mode.</P>
            <H2>Custom domain</H2>
            <P>If you are running a self-hosted instance of NistaGPS, you can configure a custom domain. Point your DNS A record to the server IP and set the domain here. NistaGPS will serve the application at your custom domain with a valid SSL certificate.</P>
          </>
        ),
      },
      {
        slug: "api-access",
        sectionId: "control-panel",
        title: "API Access",
        content: (
          <>
            <P>NistaGPS provides a REST API for integrating fleet data into your own systems, dashboards, or third-party logistics software. API keys are managed in <strong>Control Panel &rarr; API Access</strong>.</P>
            <H2>Generating an API key</H2>
            <P>Click <strong>Generate Key</strong> to create a new API token. Give it a descriptive name (e.g. "Warehouse Integration") so you can identify it later. The key is shown once — copy it immediately and store it securely.</P>
            <H2>Making requests</H2>
            <P>Include your API key in the <Code>Authorization</Code> header of every request:</P>
            <Pre>Authorization: Bearer YOUR_API_KEY</Pre>
            <H2>Available endpoints</H2>
            <UL>
              <LI><Code>GET /api/vehicles</Code> — list all vehicles with their current status</LI>
              <LI><Code>GET /api/vehicles/:id/history</Code> — GPS history for a vehicle</LI>
              <LI><Code>GET /api/events</Code> — recent alert events</LI>
              <LI><Code>GET /api/reports/summary</Code> — fleet summary statistics</LI>
            </UL>
            <Callout type="warning">API keys grant full read access to your fleet data. Treat them like passwords — never expose them in client-side code or public repositories.</Callout>
          </>
        ),
      },
      {
        slug: "email-sms-config",
        sectionId: "control-panel",
        title: "Email & SMS Configuration",
        content: (
          <>
            <P>NistaGPS can send alert notifications and reports by email and SMS. Configure your outbound providers in <strong>Control Panel &rarr; Email &amp; SMS</strong>.</P>
            <H2>Email (SMTP)</H2>
            <P>Enter your SMTP server details: host, port (typically 587 for TLS), username, and password. NistaGPS will use this server to send all email notifications. Test the configuration with the <strong>Send Test Email</strong> button.</P>
            <H2>SMS gateway</H2>
            <P>NistaGPS supports SMS delivery via the GPS Tracker mobile app (SMS gateway mode) or a third-party API such as Twilio or MSG91. Enter your gateway credentials and the sender ID you want to appear on alert messages.</P>
            <H2>Alert templates</H2>
            <P>Customise the text content of email and SMS alerts in the <strong>Templates</strong> section. Use placeholder variables like <Code>{"{vehicle_name}"}</Code>, <Code>{"{speed}"}</Code>, and <Code>{"{location}"}</Code> which are replaced with real values when the alert fires.</P>
          </>
        ),
      },
    ],
  },
  {
    id: "objects",
    title: "Objects & Fleet",
    articles: [
      {
        slug: "objects-overview",
        sectionId: "objects",
        title: "Objects (Vehicles)",
        content: (
          <>
            <P>In NistaGPS, each physical vehicle or asset with a GPS tracker is called an <em>object</em>. The Objects module is where you add, configure, and manage all tracked assets in your fleet.</P>
            <H2>Adding an object</H2>
            <P>Navigate to <strong>Vehicles</strong> in the sidebar and click <strong>Add Vehicle</strong>. Required fields are:</P>
            <UL>
              <LI><strong>Name</strong> — a human-readable label (e.g. "Truck 01 - KA01AB1234")</LI>
              <LI><strong>IMEI</strong> — the 15-digit unique identifier of the GPS device</LI>
              <LI><strong>Protocol</strong> — the communication protocol your device uses (e.g. GT06)</LI>
            </UL>
            <H2>Object settings</H2>
            <P>Each object has configurable settings including: icon style, colour, speed limit threshold, odometer value, fuel capacity, and custom fields. Access these by clicking the gear icon next to any vehicle in the Vehicles list.</P>
            <H2>Bulk import</H2>
            <P>To add many vehicles at once, use the CSV import feature. Download the template, fill in your vehicle details, and upload the file. The system validates each row and shows a preview before committing the import.</P>
            <Callout type="info">IMEI numbers must be unique across your entire organisation. Attempting to register an IMEI that is already in use will return an error.</Callout>
          </>
        ),
      },
      {
        slug: "groups",
        sectionId: "objects",
        title: "Groups",
        content: (
          <>
            <P>Groups let you organise vehicles into logical sets — for example by department, region, vehicle type, or shift. Once created, groups can be used to filter the vehicle list and scope reports to a subset of your fleet.</P>
            <H2>Creating a group</H2>
            <P>Go to <strong>Vehicles &rarr; Groups</strong> and click <strong>Add Group</strong>. Enter a name and optionally a colour. The colour is used to visually distinguish the group in the sidebar filter dropdown.</P>
            <H2>Assigning vehicles to groups</H2>
            <P>Open any vehicle's settings and use the <strong>Group</strong> field to assign it to one or more groups. A vehicle can belong to multiple groups simultaneously.</P>
            <H2>Filtering by group</H2>
            <P>In the left side panel, use the group dropdown above the vehicle list to show only vehicles from a specific group. The map will also zoom to fit the selected group's vehicles.</P>
          </>
        ),
      },
      {
        slug: "drivers",
        sectionId: "objects",
        title: "Drivers",
        content: (
          <>
            <P>The Drivers module tracks which driver is operating which vehicle at any point in time. Driver identification is done via RFID/iButton tags or by manual trip assignment.</P>
            <H2>Adding a driver</H2>
            <P>Navigate to <strong>Vehicles &rarr; Drivers</strong> and click <strong>Add Driver</strong>. Enter the driver's name, phone number, and optionally their licence number and expiry date. If using RFID identification, enter the tag ID.</P>
            <H2>Driver assignment</H2>
            <P>When a driver touches their RFID tag to the in-vehicle reader, NistaGPS automatically links that driver to the vehicle for the duration of the trip. Manual assignments can be made from the vehicle details panel.</P>
            <H2>Driver reports</H2>
            <P>Once drivers are assigned to trips, the Reports module can generate driver-specific summaries showing distance driven, idle time, speeding events, and trip count for any date range.</P>
          </>
        ),
      },
      {
        slug: "places-geofences",
        sectionId: "objects",
        title: "Geofences (Zones)",
        content: (
          <>
            <P>Geofences are virtual boundaries drawn on the map. When a vehicle enters or exits a geofence, NistaGPS can trigger alerts, log an event, or send a notification.</P>
            <H2>Drawing a geofence</H2>
            <P>Go to <strong>Geofences</strong> in the sidebar. Click the <strong>Draw</strong> button and choose a shape: circle, rectangle, or polygon. Click on the map to draw your boundary. Give the geofence a name and choose the trigger condition: enter, exit, or both.</P>
            <H2>Alert actions</H2>
            <P>For each geofence you can configure: whether to send a push notification, an SMS, or an email when the condition is triggered. You can also restrict alerts to specific time windows (e.g. only after business hours).</P>
            <H2>Geofence reports</H2>
            <P>The Reports module includes a Geofence Summary report showing all entries and exits for a selected boundary over a chosen date range, with timestamps and vehicle names.</P>
            <Callout type="tip">Use circular geofences for single-point locations (depots, customer sites). Use polygons for irregular areas like industrial estates or city zones.</Callout>
          </>
        ),
      },
      {
        slug: "places-pois",
        sectionId: "objects",
        title: "Places of Interest (POIs)",
        content: (
          <>
            <P>Places of Interest (POIs) are named map markers that represent fixed locations relevant to your fleet — depots, customer sites, fuel stations, or service centres. POIs make your map more readable and can be used as reference points in reports.</P>
            <H2>Adding a POI</H2>
            <P>Navigate to <strong>POIs</strong> in the sidebar and click <strong>Add POI</strong>. You can place the marker by clicking on the map or by entering a GPS coordinate or address. Give it a name and optionally a category and icon.</P>
            <H2>POI categories</H2>
            <P>Organise your POIs into categories (e.g. "Customer", "Depot", "Fuel") for easier filtering on the map. Each category can have a different icon colour.</P>
            <H2>POI proximity alerts</H2>
            <P>Configure a radius around a POI and NistaGPS will notify you when a vehicle arrives at or departs from that location — similar to a circular geofence but simpler to set up.</P>
          </>
        ),
      },
    ],
  },
  {
    id: "events",
    title: "Events & Alerts",
    articles: [
      {
        slug: "events-overview",
        sectionId: "events",
        title: "Events Overview",
        content: (
          <>
            <P>Events are automatically logged records of significant conditions detected for your vehicles. NistaGPS monitors each vehicle's GPS stream continuously and raises events when configured thresholds are crossed.</P>
            <H2>Standard event types</H2>
            <UL>
              <LI><strong>Speeding</strong> — vehicle exceeded the speed limit configured on the object</LI>
              <LI><strong>Ignition On / Off</strong> — vehicle engine started or stopped</LI>
              <LI><strong>Geofence Enter / Exit</strong> — vehicle crossed a geofence boundary</LI>
              <LI><strong>Idle</strong> — vehicle engine on but stationary for longer than the configured threshold</LI>
              <LI><strong>Harsh Acceleration / Braking</strong> — rapid change in speed detected (requires accelerometer data)</LI>
              <LI><strong>Low Battery</strong> — device internal battery below 20%</LI>
              <LI><strong>GPS Signal Lost</strong> — no satellite fix for more than 5 minutes</LI>
            </UL>
            <H2>Viewing events</H2>
            <P>Open the <strong>Events</strong> tab in the bottom panel to see a live feed of recent events. Click any event to jump to that vehicle on the map at the time the event occurred.</P>
            <H2>Event history</H2>
            <P>Historical events for any vehicle can be queried from the History module. Use the date range picker and event type filter to find specific incidents.</P>
          </>
        ),
      },
      {
        slug: "alert-settings",
        sectionId: "events",
        title: "Alert Settings",
        content: (
          <>
            <P>Alert Settings let you control which events trigger notifications, the notification channels (push, SMS, email), and any time-based restrictions on when alerts fire.</P>
            <H2>Configuring alerts</H2>
            <P>Navigate to <strong>Alert Settings</strong> from the sidebar. For each event type, toggle it on or off and select the delivery channels. You can configure alerts globally (applying to all vehicles) or per vehicle from the vehicle settings panel.</P>
            <H2>Speed threshold</H2>
            <P>Set a fleet-wide default speed limit for speeding alerts. Individual vehicles can override this default — useful if you have a mix of city delivery vehicles and motorway-capable trucks with different legal speed limits.</P>
            <H2>Quiet hours</H2>
            <P>Set quiet hours to suppress alerts outside business hours. For example, you may not want to receive SMS alerts for ignition-on events at 3 AM if a vehicle is used after hours by an authorised driver.</P>
            <Callout type="tip">For driver-facing applications, consider limiting alerts to critical events only (harsh braking, speeding) to avoid notification fatigue.</Callout>
          </>
        ),
      },
      {
        slug: "templates",
        sectionId: "events",
        title: "Notification Templates",
        content: (
          <>
            <P>Notification templates define the content of the messages sent when an event fires. Templates are shared across email and SMS channels but you can customise each independently.</P>
            <H2>Template variables</H2>
            <P>Use double-brace placeholders in your template text. NistaGPS replaces them with live values when sending the notification:</P>
            <UL>
              <LI><Code>{"{vehicle_name}"}</Code> — the vehicle display name</LI>
              <LI><Code>{"{event_type}"}</Code> — the type of event (e.g. "Speeding")</LI>
              <LI><Code>{"{speed}"}</Code> — current speed in km/h</LI>
              <LI><Code>{"{address}"}</Code> — reverse-geocoded street address</LI>
              <LI><Code>{"{timestamp}"}</Code> — date and time of the event</LI>
              <LI><Code>{"{driver_name}"}</Code> — assigned driver (if available)</LI>
            </UL>
            <H2>Example SMS template</H2>
            <Pre>{`Alert: {vehicle_name} is speeding at {speed} km/h
Location: {address}
Time: {timestamp}`}</Pre>
            <P>Keep SMS templates short (under 160 characters) to avoid messages splitting across multiple SMS segments which increases cost.</P>
          </>
        ),
      },
    ],
  },
  {
    id: "history",
    title: "History & Playback",
    articles: [
      {
        slug: "history-overview",
        sectionId: "history",
        title: "History Overview",
        content: (
          <>
            <P>The History module lets you replay any vehicle's past journey on the map. Select a vehicle and a date range and NistaGPS will draw the route taken, with a timeline scrubber to step through the journey.</P>
            <H2>Opening history</H2>
            <P>Click <strong>History</strong> in the sidebar. Choose a vehicle from the dropdown, then select a start date and end date. Click <strong>Load</strong> to fetch the GPS data for that period.</P>
            <H2>Playback controls</H2>
            <P>Use the playback bar at the bottom of the history panel to control the animation:</P>
            <UL>
              <LI><strong>Play / Pause</strong> — start or stop the animation</LI>
              <LI><strong>Speed selector</strong> — set playback at 1×, 2×, 5×, or 10× real time</LI>
              <LI><strong>Scrubber</strong> — drag to any point in the journey timeline</LI>
              <LI><strong>Previous / Next stop</strong> — jump to each ignition-off event</LI>
            </UL>
            <H2>Route trail</H2>
            <P>The route is drawn as a coloured line on the map. Solid segments represent continuous GPS coverage. Dashed segments indicate gaps of more than 5 minutes where no GPS data was received (e.g. tunnels, signal loss, or device off).</P>
            <Callout type="info">History data is retained for the number of days specified in your subscription plan. Data older than the retention limit is automatically archived.</Callout>
          </>
        ),
      },
      {
        slug: "history-graph",
        sectionId: "history",
        title: "History Graph & Events",
        content: (
          <>
            <P>Alongside the map playback, the History module includes a data graph that plots speed, ignition state, and other sensor values over the selected time period.</P>
            <H2>Speed graph</H2>
            <P>The speed graph shows vehicle speed (km/h) on the Y axis against time on the X axis. Speeding events are highlighted in red. The graph is linked to the map — clicking a point on the graph moves the vehicle marker to that position on the map.</P>
            <H2>Ignition timeline</H2>
            <P>Below the speed graph is an ignition timeline bar showing engine-on periods in green and engine-off periods in grey. Each ignition-on segment corresponds to a trip; gaps between them are stops.</P>
            <H2>Event markers</H2>
            <P>Events (speeding, geofence breach, harsh braking) are shown as vertical markers on the timeline graph. Click a marker to open the event detail popup with the exact time, location, and any associated data such as speed or driver name.</P>
          </>
        ),
      },
    ],
  },
  {
    id: "reports",
    title: "Reports",
    articles: [
      {
        slug: "reports-overview",
        sectionId: "reports",
        title: "Reports Overview",
        content: (
          <>
            <P>The Reports module generates detailed tabular and chart-based summaries of fleet activity over a selected date range. Reports can be exported as PDF or CSV for use in spreadsheets and management presentations.</P>
            <H2>Available report types</H2>
            <UL>
              <LI><strong>Trip Summary</strong> — start/end location, distance, and duration for each trip</LI>
              <LI><strong>Daily Mileage</strong> — total kilometres driven per vehicle per day</LI>
              <LI><strong>Speeding Report</strong> — all speeding events with duration and maximum speed</LI>
              <LI><strong>Idle Report</strong> — engine-on time with the vehicle stationary, by vehicle</LI>
              <LI><strong>Geofence Report</strong> — entry/exit times for selected geofences</LI>
              <LI><strong>Driver Behaviour</strong> — scored summary of harsh events per driver</LI>
              <LI><strong>Fuel Usage</strong> — estimated fuel consumption based on distance and fuel type</LI>
            </UL>
            <H2>Generating a report</H2>
            <P>Select a report type from the dropdown, choose the vehicle(s) or group, set the date range, and click <strong>Generate</strong>. Large reports may take a few seconds. The result is displayed in-page and a download button appears for export.</P>
            <H2>Scheduled reports</H2>
            <P>Reports can be scheduled to run automatically and delivered to a list of email addresses. Configure scheduled reports from <strong>Reports &rarr; Scheduled</strong>. Supported frequencies are daily, weekly, and monthly.</P>
          </>
        ),
      },
    ],
  },
  {
    id: "kml-sms",
    title: "KML & SMS",
    articles: [
      {
        slug: "kml",
        sectionId: "kml-sms",
        title: "KML Import & Export",
        content: (
          <>
            <P>KML (Keyhole Markup Language) is an open format used by Google Maps, Google Earth, and GIS tools to share geographic data. NistaGPS supports both importing KML files to add geofences and POIs, and exporting fleet data as KML for use in external mapping tools.</P>
            <H2>Importing KML</H2>
            <P>Go to <strong>Geofences</strong> or <strong>POIs</strong> and click <strong>Import KML</strong>. Select a <Code>.kml</Code> or <Code>.kmz</Code> file from your computer. NistaGPS will parse the file and show a preview of the boundaries or markers it found. Confirm to add them to your account.</P>
            <H2>Exporting route history as KML</H2>
            <P>From the History module, after loading a vehicle's route, click <strong>Export &rarr; KML</strong>. The downloaded file can be opened in Google Earth to view the route in 3D with street-level detail.</P>
            <H2>Supported KML elements</H2>
            <UL>
              <LI>Placemarks (points) — imported as POIs</LI>
              <LI>Polygons — imported as polygon geofences</LI>
              <LI>LineStrings — imported as routes</LI>
              <LI>Folders — used to organise imported elements into groups</LI>
            </UL>
          </>
        ),
      },
      {
        slug: "sms-commands",
        sectionId: "kml-sms",
        title: "SMS Commands",
        content: (
          <>
            <P>Many GPS tracker devices support two-way SMS communication — you can send commands to the device and receive responses, all without physical access to the vehicle. NistaGPS provides a command interface for supported devices.</P>
            <H2>Sending a command</H2>
            <P>Select a vehicle in the tracking view and click the <strong>Command</strong> button in the vehicle info panel. Choose a command from the list or enter a custom command string. Click <strong>Send</strong> — NistaGPS forwards the command to the device via SMS or the TCP connection.</P>
            <H2>Common commands</H2>
            <UL>
              <LI><strong>Get Location</strong> — request an immediate GPS fix and response</LI>
              <LI><strong>Reboot Device</strong> — restart the tracker's firmware</LI>
              <LI><strong>Set APN</strong> — update the device's SIM APN settings remotely</LI>
              <LI><strong>Set Server IP</strong> — update the server address the device connects to</LI>
              <LI><strong>Enable / Disable Engine Cut</strong> — immobilise the vehicle (requires relay wiring)</LI>
            </UL>
            <Callout type="warning">Engine cut commands immobilise the vehicle immediately. Only use this feature when the vehicle is stationary and you have verified the driver is aware.</Callout>
          </>
        ),
      },
    ],
  },
  {
    id: "mobile-apps",
    title: "Mobile Apps",
    articles: [
      {
        slug: "mobile-gps-server",
        sectionId: "mobile-apps",
        title: "GPS Server Mobile App",
        content: (
          <>
            <P>The GPS Server mobile app turns an Android smartphone into a GPS tracking server that can receive data from multiple tracker devices over Wi-Fi or mobile data. It is ideal for small fleets or offline environments where a cloud server is not available.</P>
            <H2>Download</H2>
            <P>Search for <strong>GPS Server</strong> in the Google Play Store. The app is free to download. After installation, open it and grant the required permissions (location, background activity, network).</P>
            <H2>Setup</H2>
            <P>Configure the server port (default <Code>5023</Code> for GT06 protocol) and start the server. Note the phone's local IP address shown on the dashboard screen. Configure your GPS devices to send data to this IP and port.</P>
            <H2>Forwarding data to NistaGPS</H2>
            <P>The GPS Server app can forward all received data to a remote NistaGPS cloud server simultaneously. Enter the NistaGPS server address (<Code>34.133.128.65</Code>) and port in the Forwarding settings.</P>
          </>
        ),
      },
      {
        slug: "mobile-gps-tracker",
        sectionId: "mobile-apps",
        title: "GPS Tracker App",
        content: (
          <>
            <P>The GPS Tracker app turns an Android or iOS smartphone into a GPS tracking device. It uses the phone's built-in GPS and sends location updates to the NistaGPS server — no dedicated hardware required.</P>
            <H2>Download</H2>
            <P>Available on both Google Play Store and Apple App Store. Search for <strong>GPS Tracker by Freeyourcoding</strong>.</P>
            <H2>Setup</H2>
            <P>After installation, open the app and enter your NistaGPS server address and port. Then enter the IMEI or device ID that matches a vehicle registered in your NistaGPS account. The app will start sending location updates every 30 seconds by default.</P>
            <H2>Battery optimisation</H2>
            <P>For reliable background tracking on Android, disable battery optimisation for the GPS Tracker app in your phone settings. Without this, Android may suspend the app and stop location updates.</P>
            <Callout type="tip">The GPS Tracker app is useful for tracking deliveries, field workers, or personal vehicles without purchasing dedicated hardware.</Callout>
          </>
        ),
      },
      {
        slug: "mobile-sms-gateway",
        sectionId: "mobile-apps",
        title: "SMS Gateway App",
        content: (
          <>
            <P>The SMS Gateway app routes alert SMS messages from NistaGPS through a physical SIM card in an Android phone, avoiding the cost of a cloud SMS API. This is particularly useful in regions where local SMS rates are significantly cheaper than API-based services.</P>
            <H2>How it works</H2>
            <P>NistaGPS sends the alert message content to the SMS Gateway app via an HTTP request on your local network or via the internet. The app then sends the SMS using the phone's SIM card, with the originating number being your SIM's mobile number.</P>
            <H2>Setup</H2>
            <P>Install the SMS Gateway app on a dedicated Android phone with an active SIM card. Note the local IP shown on the app's home screen. In NistaGPS Control Panel &rarr; SMS Configuration, set the gateway type to <strong>Local HTTP</strong> and enter the phone's IP and port.</P>
            <H2>Limitations</H2>
            <UL>
              <LI>The gateway phone must be online and the app running in the foreground or with battery optimisation disabled</LI>
              <LI>International SMS may be blocked by the phone carrier</LI>
              <LI>High alert volumes may be throttled by the carrier to prevent spam detection</LI>
            </UL>
          </>
        ),
      },
    ],
  },
  {
    id: "how-to",
    title: "How To",
    articles: [
      {
        slug: "howto-add-vehicle",
        sectionId: "how-to",
        title: "How to Add a Vehicle",
        content: (
          <>
            <P>Adding a vehicle to NistaGPS takes under 2 minutes if you have the GPS device's IMEI number ready.</P>
            <H2>Steps</H2>
            <UL>
              <LI>Go to <strong>Vehicles</strong> in the sidebar</LI>
              <LI>Click <strong>Add Vehicle</strong> (+ button, top right)</LI>
              <LI>Enter the vehicle name (e.g. "Delivery Van 03")</LI>
              <LI>Enter the IMEI number from the back of the GPS device</LI>
              <LI>Select the protocol (GT06 for most Concox/Coban devices)</LI>
              <LI>Optionally set registration plate, fuel type, and odometer</LI>
              <LI>Click <strong>Save</strong></LI>
            </UL>
            <P>The vehicle immediately appears in the object list. It will show as offline until the GPS device connects and sends its first update.</P>
          </>
        ),
      },
      {
        slug: "howto-set-alerts",
        sectionId: "how-to",
        title: "How to Set Up Speed Alerts",
        content: (
          <>
            <P>Speed alerts notify you in real time when a vehicle exceeds a configured threshold. Here is how to set them up.</P>
            <H2>Steps</H2>
            <UL>
              <LI>Go to <strong>Alert Settings</strong> from the sidebar</LI>
              <LI>Find the <strong>Speeding</strong> row and toggle it <strong>On</strong></LI>
              <LI>Set the speed threshold (e.g. 80 km/h)</LI>
              <LI>Choose delivery channels: Push notification, SMS, and/or Email</LI>
              <LI>For SMS/Email, ensure your contact details are saved in your Profile</LI>
              <LI>Click <strong>Save Settings</strong></LI>
            </UL>
            <P>To set a different speed limit for a specific vehicle, open that vehicle's settings in the Vehicles page and set the <strong>Speed Limit Override</strong> field.</P>
          </>
        ),
      },
      {
        slug: "howto-view-history",
        sectionId: "how-to",
        title: "How to View Trip History",
        content: (
          <>
            <P>Follow these steps to replay a vehicle's journey from any past date.</P>
            <H2>Steps</H2>
            <UL>
              <LI>Click <strong>History</strong> in the sidebar</LI>
              <LI>Select the vehicle from the dropdown</LI>
              <LI>Choose a date range using the date picker (max 7 days per query for free plans)</LI>
              <LI>Click <strong>Load History</strong></LI>
              <LI>The route appears on the map as a coloured line</LI>
              <LI>Press <strong>Play</strong> to animate the journey in real time, or drag the scrubber to a specific moment</LI>
            </UL>
            <Callout type="info">Use the speed selector (1×, 2×, 5×, 10×) to fast-forward through long journeys. Ignition-off stops are automatically paused in playback for 1 second to make them visible.</Callout>
          </>
        ),
      },
      {
        slug: "howto-generate-reports",
        sectionId: "how-to",
        title: "How to Generate a Trip Report",
        content: (
          <>
            <P>Trip reports summarise all journeys made by one or more vehicles over a selected period.</P>
            <H2>Steps</H2>
            <UL>
              <LI>Click <strong>Reports</strong> in the sidebar</LI>
              <LI>Select <strong>Trip Summary</strong> from the report type dropdown</LI>
              <LI>Choose the vehicle or group</LI>
              <LI>Set the date range</LI>
              <LI>Click <strong>Generate Report</strong></LI>
              <LI>Review the results in the table: each row is one trip with start/end address, distance, and duration</LI>
              <LI>Click <strong>Export PDF</strong> or <strong>Export CSV</strong> to download</LI>
            </UL>
          </>
        ),
      },
      {
        slug: "howto-manage-drivers",
        sectionId: "how-to",
        title: "How to Manage Drivers",
        content: (
          <>
            <P>The Drivers module lets you associate named drivers with vehicle trips for accountability and reporting.</P>
            <H2>Adding a driver</H2>
            <UL>
              <LI>Go to <strong>Vehicles &rarr; Drivers</strong></LI>
              <LI>Click <strong>Add Driver</strong></LI>
              <LI>Enter the driver's name, phone number, and licence details</LI>
              <LI>If using RFID tags, enter the tag ID (printed on the card or read with an NFC reader)</LI>
              <LI>Click <strong>Save</strong></LI>
            </UL>
            <H2>Assigning a driver to a trip manually</H2>
            <UL>
              <LI>Open the vehicle in the tracking view</LI>
              <LI>Click <strong>Assign Driver</strong> in the info panel</LI>
              <LI>Select the driver from the list</LI>
              <LI>The assignment is recorded for the current trip</LI>
            </UL>
          </>
        ),
      },
      {
        slug: "howto-create-geofence",
        sectionId: "how-to",
        title: "How to Create a Geofence",
        content: (
          <>
            <P>Geofences let you receive alerts when vehicles enter or leave a defined area.</P>
            <H2>Steps</H2>
            <UL>
              <LI>Click <strong>Geofences</strong> in the sidebar</LI>
              <LI>Click <strong>Add Geofence</strong> (+ button)</LI>
              <LI>Choose a shape: Circle, Rectangle, or Polygon</LI>
              <LI>Click on the map to draw the boundary</LI>
              <LI>Give the geofence a name</LI>
              <LI>Set the trigger: <strong>On Enter</strong>, <strong>On Exit</strong>, or <strong>Both</strong></LI>
              <LI>Choose the vehicles or groups the geofence applies to</LI>
              <LI>Enable SMS or email notification if required</LI>
              <LI>Click <strong>Save</strong></LI>
            </UL>
          </>
        ),
      },
      {
        slug: "howto-share-tracking",
        sectionId: "how-to",
        title: "How to Share a Live Tracking Link",
        content: (
          <>
            <P>You can share a temporary read-only link to a vehicle's live position with clients or managers who don't have a NistaGPS login.</P>
            <H2>Steps</H2>
            <UL>
              <LI>Select a vehicle in the tracking view</LI>
              <LI>Click the <strong>Share</strong> button in the vehicle info panel</LI>
              <LI>Choose a link expiry duration (1 hour, 24 hours, 7 days)</LI>
              <LI>Copy the generated URL</LI>
              <LI>Send the URL to the recipient via WhatsApp, email, or SMS</LI>
            </UL>
            <P>The recipient can open the link in any browser without a NistaGPS account. They see only the selected vehicle's live position on a simple map — no other fleet data is exposed.</P>
            <Callout type="warning">Shared links expire after the duration you set. Do not share links with sensitive locations for long durations.</Callout>
          </>
        ),
      },
      {
        slug: "howto-export-data",
        sectionId: "how-to",
        title: "How to Export Fleet Data",
        content: (
          <>
            <P>NistaGPS supports exporting fleet data in several formats for use in spreadsheets, accounting software, or GIS tools.</P>
            <H2>Exporting reports</H2>
            <P>From any generated report, click <strong>Export PDF</strong> for a formatted document or <strong>Export CSV</strong> for raw data. CSV exports include all columns visible in the report table.</P>
            <H2>Exporting GPS history as KML</H2>
            <P>From the History module, after loading a route, click <strong>Export &rarr; KML</strong>. Open the file in Google Earth or any KML-compatible GIS application.</P>
            <H2>API export</H2>
            <P>For automated or programmatic exports, use the REST API (see API Access). The <Code>GET /api/vehicles/:id/history</Code> endpoint returns GPS points as JSON which you can process in any language.</P>
          </>
        ),
      },
      {
        slug: "howto-maintenance",
        sectionId: "how-to",
        title: "How to Set Up Maintenance Reminders",
        content: (
          <>
            <P>NistaGPS can send reminders when a vehicle is due for service based on odometer reading or elapsed time.</P>
            <H2>Steps</H2>
            <UL>
              <LI>Open the vehicle settings (gear icon in the Vehicles list)</LI>
              <LI>Go to the <strong>Maintenance</strong> tab</LI>
              <LI>Click <strong>Add Reminder</strong></LI>
              <LI>Choose the trigger type: <strong>Distance</strong> (km) or <strong>Time</strong> (months)</LI>
              <LI>Set the interval and the reminder lead time (e.g. remind 500 km before due)</LI>
              <LI>Enter the notification recipients (email addresses)</LI>
              <LI>Click <strong>Save</strong></LI>
            </UL>
            <P>When the vehicle approaches the maintenance threshold, NistaGPS sends reminder emails and shows a warning badge on the vehicle in the tracking view.</P>
          </>
        ),
      },
      {
        slug: "howto-billing",
        sectionId: "how-to",
        title: "How to Renew Your Subscription",
        content: (
          <>
            <P>Subscriptions in NistaGPS are per-vehicle. Renewing adds days to each active vehicle's subscription.</P>
            <H2>Steps</H2>
            <UL>
              <LI>Click <strong>Renew</strong> in the sidebar, or go to your account details and click <strong>Renew Subscription</strong></LI>
              <LI>Select the plan duration: 1 month, 3 months, 6 months, or 1 year</LI>
              <LI>Select the vehicles to renew (or select all)</LI>
              <LI>Review the total cost and click <strong>Pay Now</strong></LI>
              <LI>Complete payment via Razorpay (UPI, credit card, net banking)</LI>
              <LI>Subscription dates update immediately after successful payment</LI>
            </UL>
            <Callout type="tip">Annual plans offer a significant discount over monthly billing. If your fleet size is stable, consider switching to annual to reduce administration overhead.</Callout>
          </>
        ),
      },
    ],
  },
  {
    id: "faq",
    title: "FAQ",
    articles: [
      {
        slug: "faq-device-not-connecting",
        sectionId: "faq",
        title: "My device is not connecting to the server",
        content: (
          <>
            <P>If your GPS tracker is not appearing on the map or is shown as offline, work through the following checklist.</P>
            <H2>Checklist</H2>
            <UL>
              <LI><strong>SIM card</strong> — is the SIM active and does it have a mobile data plan? Test by inserting it into a phone and browsing a website.</LI>
              <LI><strong>APN settings</strong> — has the correct APN been configured on the device? Contact your SIM provider for APN details.</LI>
              <LI><strong>Server address</strong> — is the device programmed with the correct IP (<Code>34.133.128.65</Code>) and port (<Code>5023</Code> for GT06 devices)?</LI>
              <LI><strong>IMEI registration</strong> — is the device IMEI added to NistaGPS? Check Vehicles and look for the IMEI in the list.</LI>
              <LI><strong>Power</strong> — is the device powered (connected to 12V power or charged battery)?</LI>
              <LI><strong>GPS fix</strong> — bring the device outdoors in open sky for 5–10 minutes for an initial fix.</LI>
            </UL>
            <Callout type="tip">Send the diagnostic SMS command to your device and it will reply with its current status including signal strength, GPS fix quality, and server connection state. See the device manual for the specific command.</Callout>
          </>
        ),
      },
      {
        slug: "faq-location-inaccurate",
        sectionId: "faq",
        title: "The vehicle location is inaccurate or jumping",
        content: (
          <>
            <P>GPS accuracy depends on satellite visibility, device firmware, and the environment the vehicle is operating in.</P>
            <H2>Common causes</H2>
            <UL>
              <LI><strong>Indoor or underground parking</strong> — GPS signals do not penetrate concrete structures. The last known position is held until satellite lock is regained.</LI>
              <LI><strong>Urban canyons</strong> — tall buildings reflect GPS signals (multipath effect) causing position jumps of up to 100 metres.</LI>
              <LI><strong>Poor antenna placement</strong> — the device antenna should face upward toward the sky, ideally behind the windscreen or under the roof lining.</LI>
              <LI><strong>Firmware version</strong> — outdated device firmware can have reduced GPS accuracy. Check with your device supplier for updates.</LI>
            </UL>
            <H2>NistaGPS filtering</H2>
            <P>NistaGPS applies server-side filtering to discard obviously erroneous GPS points (positions that would require physically impossible speeds). If jumpy positions are still appearing, contact support with the vehicle's IMEI.</P>
          </>
        ),
      },
      {
        slug: "faq-billing",
        sectionId: "faq",
        title: "Billing and payment questions",
        content: (
          <>
            <H2>What payment methods are accepted?</H2>
            <P>NistaGPS uses Razorpay for payment processing. Accepted methods include UPI (GPay, PhonePe, Paytm), credit/debit cards (Visa, Mastercard, RuPay), and net banking for all major Indian banks.</P>
            <H2>Can I get a refund?</H2>
            <P>Subscription fees are non-refundable once the billing period has started. If you believe you were charged in error, contact support at <Code>support@nistagps.com</Code> with your invoice number.</P>
            <H2>Is GST included in the price?</H2>
            <P>All prices displayed are exclusive of GST. GST at 18% is added at checkout. Tax invoices (with GSTIN) are automatically generated and emailed after each payment.</P>
            <H2>What happens if a payment fails?</H2>
            <P>If a payment fails, your vehicles remain active for a 7-day grace period. You will receive email reminders to update your payment method. After the grace period, vehicles are suspended until payment is received.</P>
          </>
        ),
      },
      {
        slug: "faq-account-access",
        sectionId: "faq",
        title: "I cannot log in to my account",
        content: (
          <>
            <P>There are several reasons why login may fail. Here is how to resolve the most common ones.</P>
            <H2>Wrong credentials</H2>
            <P>Ensure you are entering your phone number in the correct format (10 digits, no country code or spaces). Passwords are case-sensitive. If you have forgotten your password, contact your fleet administrator — they can reset it from User Management in the Control Panel.</P>
            <H2>Account suspended</H2>
            <P>If your subscription has expired and no payment has been received during the grace period, account access is suspended. Contact <Code>support@nistagps.com</Code> to discuss reactivation.</P>
            <H2>Account deactivated by admin</H2>
            <P>An administrator may have deactivated your account. Contact your fleet manager to check your account status.</P>
          </>
        ),
      },
      {
        slug: "faq-data-retention",
        sectionId: "faq",
        title: "How long is GPS data kept?",
        content: (
          <>
            <P>Data retention depends on your subscription plan:</P>
            <UL>
              <LI><strong>Basic plan</strong> — 30 days of GPS history</LI>
              <LI><strong>Standard plan</strong> — 90 days of GPS history</LI>
              <LI><strong>Premium plan</strong> — 365 days of GPS history</LI>
            </UL>
            <P>GPS data older than your plan's retention limit is automatically deleted. This includes history tracks, events, and raw location messages. Exported reports and downloaded files are not affected — once exported, you own the data.</P>
            <H2>Regulatory compliance</H2>
            <P>If your business requires data retention beyond one year for regulatory or insurance reasons, contact NistaGPS support to discuss a custom enterprise plan with extended retention.</P>
          </>
        ),
      },
      {
        slug: "faq-api-access",
        sectionId: "faq",
        title: "Can I integrate NistaGPS with my own software?",
        content: (
          <>
            <P>Yes. NistaGPS provides a REST API for reading fleet data. It is available on Standard and Premium plans. See the <strong>API Access</strong> article in the Control Panel section for full documentation.</P>
            <H2>What can the API do?</H2>
            <UL>
              <LI>Read current vehicle positions and status</LI>
              <LI>Query historical GPS tracks</LI>
              <LI>List events and alerts</LI>
              <LI>Generate report summaries</LI>
            </UL>
            <H2>Webhooks</H2>
            <P>Premium plan customers can configure webhook endpoints to receive real-time event notifications (HTTP POST) when vehicles trigger alerts. This removes the need to poll the API for updates.</P>
          </>
        ),
      },
      {
        slug: "faq-mobile-app",
        sectionId: "faq",
        title: "Is there a mobile app for tracking?",
        content: (
          <>
            <P>NistaGPS does not currently have a dedicated fleet monitoring mobile app. However, the web interface at <Code>nistagps.com</Code> is fully responsive and works well on smartphones and tablets in any modern browser.</P>
            <H2>Add to home screen</H2>
            <P>On both Android and iOS, you can add the NistaGPS web app to your home screen for a native-app-like experience:</P>
            <UL>
              <LI><strong>Android (Chrome)</strong>: tap the three-dot menu → <em>Add to Home Screen</em></LI>
              <LI><strong>iOS (Safari)</strong>: tap the Share button → <em>Add to Home Screen</em></LI>
            </UL>
            <H2>GPS Tracker and GPS Server</H2>
            <P>Related mobile apps are available: <strong>GPS Tracker</strong> turns a smartphone into a tracking device, and <strong>GPS Server</strong> turns a phone into a local GPS server. See the Mobile Apps section for details.</P>
          </>
        ),
      },
      {
        slug: "faq-multiple-users",
        sectionId: "faq",
        title: "Can multiple users access the same account?",
        content: (
          <>
            <P>Yes. NistaGPS supports multi-user access within a single organisation. Each user has their own login credentials and can be granted different roles and module permissions.</P>
            <H2>Adding users</H2>
            <P>Administrators can add additional user accounts from <strong>Control Panel &rarr; User Management</strong>. There is no extra charge per user account — you pay only for the vehicles you track.</P>
            <H2>Concurrent sessions</H2>
            <P>Multiple users can be logged in at the same time. All users see the same live vehicle data. Each user's map view, selected vehicles, and filters are independent of other users.</P>
            <H2>Role separation</H2>
            <P>Use role-based access to give different levels of access: dispatchers may need full access, field supervisors may need read-only reporting access, and customers sharing tracking links need no login at all.</P>
          </>
        ),
      },
    ],
  },
];

export const ALL_ARTICLES: DocArticle[] = SECTIONS.flatMap((s) => s.articles);

export function getSections() {
  return SECTIONS;
}

export function getArticle(slug: string): DocArticle | undefined {
  return ALL_ARTICLES.find((a) => a.slug === slug);
}

export function getAdjacentArticles(slug: string): { prev?: DocArticle; next?: DocArticle } {
  const idx = ALL_ARTICLES.findIndex((a) => a.slug === slug);
  if (idx === -1) return {};
  return {
    prev: idx > 0 ? ALL_ARTICLES[idx - 1] : undefined,
    next: idx < ALL_ARTICLES.length - 1 ? ALL_ARTICLES[idx + 1] : undefined,
  };
}

export function getSectionForArticle(slug: string): DocSection | undefined {
  return SECTIONS.find((s) => s.articles.some((a) => a.slug === slug));
}
