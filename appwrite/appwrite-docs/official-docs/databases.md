
Start with Databases
Create database

Head to your Appwrite Console and create a database and name it Oscar. Optionally, add a custom database ID.
Create table

Create a table and name it My books. Optionally, add a custom table ID.

Navigate to Columns and create columns by clicking Create column and select String. Columns define the structure of your table's rows. Enter Column key and Size. For example, title and 100.

Navigate to Settings > Permissions and add a new role Any. Check the CREATE and READ permissions, so anyone can create and read rows.
Create rows

To create a row use the createRow method.

In the Settings menu, find your project ID and replace <PROJECT_ID> in the example.

Navigate to the Oscar database, copy the database ID, and replace <DATABASE_ID>. Then, in the My books table, copy the table ID, and replace <TABLE_ID>.

import { Client, ID, TablesDB } from "appwrite";

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1')
    .setProject('<PROJECT_ID>');

const tablesDB = new TablesDB(client);

const promise = tablesDB.createRow(
    '<DATABASE_ID>',
    '<TABLE_ID>',
    ID.unique(),
    { "title": "Hamlet" }
);

promise.then(function (response) {
    console.log(response);
}, function (error) {
    console.log(error);
});

The response should look similar to this.
JSON

{
    "title": "Hamlet",
    "$id": "65013138dcd8618e80c4",
    "$permissions": [],
    "$createdAt": "2023-09-13T03:49:12.905+00:00",
    "$$updatedAt": "2023-09-13T03:49:12.905+00:00",
    "$databaseId": "650125c64b3c25ce4bc4",
    "$tableId": "650125cff227cf9f95ad"
}

List rows

To read and query data from your table, use the listRows endpoint.

Like the previous step, replace <PROJECT_ID>, <DATABASE_ID>, and <TABLE_ID> with their respective IDs.

import { Client, Query, TablesDB } from "appwrite";

const client = new Client()
    .setEndpoint("https://<REGION>.cloud.appwrite.io/v1")
    .setProject("<PROJECT_ID>")

const tablesDB = new TablesDB(client);

const promise = tablesDB.listRows({
    databaseId: "<DATABASE_ID>",
    tableId: "<TABLE_ID>",
    queries: [
        Query.equal('title', 'Hamlet')
    ]}
);

promise.then(function (response) {
    console.log(response);
}, function (error) {
    console.log(error);
});


Databases

Databases are the largest organizational unit in Appwrite. Each database contains a group of tables. In future versions, different databases may be backed by a different database technology of your choosing.
Create in Console

The easiest way to create a database using the Appwrite Console. You can create a database by navigating to the Databases page and clicking Create database.
Create using Server SDKs

You can programmatically create databases using a Server SDK. Appwrite Server SDKs require an API key.

const sdk = require('node-appwrite');

// Init SDK
const client = new sdk.Client();

const tablesDB = new sdk.TablesDB(client);

client
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>') // Your project ID
    .setKey('919c2d18fb5d4...a2ae413da83346ad2') // Your secret API key
;

const promise = tablesDB.create({
    databaseId: '<DATABASE_ID>',
    name: '[NAME]'
});

promise.then(function (response) {
    console.log(response);
}, function (error) {
    console.log(error);
});


Tables

Appwrite uses tables as containers of rows. Each tables contains many rows identical in structure. The terms tables and rows are used because the Appwrite JSON REST API resembles the API of a traditional NoSQL database, making it intuitive and user-friendly, even though Appwrite uses SQL under the hood.

That said, Appwrite is designed to support both SQL and NoSQL database adapters like MariaDB, MySQL, or MongoDB in future versions.
Create table

You can create tables using the Appwrite Console, a Server SDK, or using the CLI.

You can create a table by heading to the Databases page, navigate to a database, and click Create table.
Permissions

Appwrite uses permissions to control data access. For security, only users that are granted permissions can access a resource. This helps prevent accidental data leaks by forcing you to make more conscious decisions around permissions.

By default, Appwrite doesn't grant permissions to any users when a new table is created. This means users can't create new rows or read, update, and delete existing rows.

Learn about configuring permissions.
Columns

All rows in a table follow the same structure. Columns are used to define the structure of your rows and help the Appwrite's API validate your users' input. Add your first column by clicking the Add column button.

You can choose between the following types.
Column	Description
string
	String column.
integer
	Integer column.
float
	Float column.
boolean
	Boolean column.
datetime
	Datetime column formatted as an ISO 8601 string.
enum
	Enum column.
ip
	IP address column for IPv4 and IPv6.
email
	Email address column.
url
	URL column.
relationship
	Relationship column relates one table to another. Learn more about relationships.

If an column must be populated in all rows, set it as required. If not, you may optionally set a default value. Additionally, decide if the column should be a single value or an array of values.

If needed, you can change an column's key, default value, size (for strings), and whether it is required or not after creation.

You can increase a string column's size without any restrictions. When decreasing size, you must ensure that your existing data is less than or equal to the new size, or the operation will fail.
Indexes

Databases use indexes to quickly locate data without having to search through every row for matches. To ensure the best performance, Appwrite recommends an index for every column queried. If you plan to query multiple columns in a single query, creating an index with all queried columns will yield optimal performance.

The following indexes are currently supported:
Type	Description
key
	Plain Index to allow queries.
unique
	Unique Index to disallow duplicates.
fulltext
	For searching within string columns. Required for the search query method.

You can create an index by navigating to your table's Indexes tab or by using your favorite Server SDK.


Rows

Each piece of data or information in Appwrite Databases is a row. Rows have a structure defined by the parent table.
Create rows
Permissions required

You must grant create permissions to users at the table level before users can create rows. Learn more about permissions

In most use cases, you will create rows programmatically.

import { Client, ID, TablesDB } from "appwrite";

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1')
    .setProject('<PROJECT_ID>');

const tablesDB = new TablesDB(client);

const promise = tablesDB.createRow(
    '<DATABASE_ID>',
    '<TABLE_ID>',
    ID.unique(),
    {}
);

promise.then(function (response) {
    console.log(response);
}, function (error) {
    console.log(error);
});

During testing, you might prefer to create rows in the Appwrite Console. To do so, navigate to the Rows tab of your table and click the Add row button.
List rows
Permissions required

You must grant read permissions to users at the table level before users can read rows. Learn more about permissions

Rows can be retrieved using the List Row endpoint.

Results can be filtered, sorted, and paginated using Appwrite's shared set of query methods. You can find a full guide on querying in the Queries Guide.

By default, results are limited to the first 25 items. You can change this through pagination.

import { Client, Query, TablesDB } from "appwrite";

const client = new Client()
    .setEndpoint("https://<REGION>.cloud.appwrite.io/v1")
    .setProject("<PROJECT_ID>")

const tablesDB = new TablesDB(client);

let promise = tablesDB.listRows(
    "<DATABASE_ID>",
    "<TABLE_ID>",
    [
        Query.equal('title', 'Avatar')
    ]
);

promise.then(function (response) {
    console.log(response);
}, function (error) {
    console.log(error);
});

Upsert rows
Permissions required

You must grant create and update permissions to users at the table level before users can upsert rows. You can also grant update permissions at the row level instead. Learn more about permissions

In most use cases, you will upsert rows programmatically.

import { Client, ID, TablesDB } from "appwrite";

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1')
    .setProject('<PROJECT_ID>');

const tablesDB = new TablesDB(client);

const promise = tablesDB.upsertRow(
    '<DATABASE_ID>',
    '<TABLE_ID>',
    ID.unique(),
    {}
);

promise.then(function (response) {
    console.log(response);
}, function (error) {
    console.log(error);
});

Permissions

In Appwrite, permissions can be granted at the table level and the row level. Before a user can create a row, you need to grant create permissions to the user.

Read, update, and delete permissions can be granted at both the table and row level. Users only need to be granted access at either the table or row level to access rows.

Learn about configuring permissions.


Database permissions

Permissions define who can access rows in a table. By default no permissions are granted to any users, so no user can access any rows. Permissions exist at two levels, table level and row level permissions.

In Appwrite, permissions are granted, meaning a user has no access by default and receive access when granted. A user with access granted at either table level or row level will be able to access a row. Users don't need access at both levels to access rows.
Table level

Table level permissions apply to every row in the table. If a user has read, create, update, or delete permissions at the table level, the user can access all rows inside the table.

Configure table level permissions by navigating to Your table > Settings > Permissions.

Learn more about permissions and roles
Row level

Row level permissions grant access to individual rows. If a user has read, create, update, or delete permissions at the row level, the user can access the individual row.

Row level permissions are only applied if Row Security is enabled in the settings of your table. Enable row level permissions by navigating to Your table > Settings > Row security.

Row level permissions are configured in individual rows.

Learn more about permissions and roles
Common use cases

For examples of how to implement common permission patterns, including creating private rows that are only accessible to their creators, see the permissions examples in our platform documentation.


Relationships

Relationships describe how rows in different tables are associated, so that related rows can be read, updated, or deleted together. Entities in real-life often associate with each other in an organic and logical way, like a person and their dog, an album and its songs, or friends in a social network.

These types of association between entities can be modeled in Appwrite using relationships.
Experimental feature

Appwrite Relationships is an experimental feature. The API and behavior are subject to change in future versions.
Relationship Columns

Relationships are represented in a table using relationship columns. The relationship column contains the ID of related rows, which it references during read, update, and delete operations. This column is null if a row has no related rows.
When to use a relationship

Relationships help reduce redundant information. For example, a user can create many posts in your app. You can model this without relationships by keeping a copy of the user's information in all the rows representing posts, but this creates a lot of duplicate information in your database about the user.
Benefits of relationships

Duplicated records waste storage, but more importantly, makes the database much harder to maintain. If the user changes their user name, you will have to update dozens or hundreds of records, a problem commonly known as an update anomaly in tablesDB. You can avoid duplicate information by storing users and posts in separate tables and relating a user and their posts through a relationship.
Tradeoff

Consider using relationships when the same information is found in multiple places to avoid duplicates. However, relationships come with the tradeoff of slowing down queries. For applications where the best read and write performance is important, it may be acceptable to tolerate duplicate data.
Opt-in Loading

By default, Appwrite returns only a row's own fields when you retrieve rows. Related rows are not automatically loaded unless you explicitly request them using query selection. This eliminates unintentional payload bloat and gives you precise control over performance.

Learn how to load relationships with queries
Directionality

Appwrite relationships can be one-way or two-way.
Type	Description
One-way
	The relationship is only visible to one side of the relation. This is similar to a tree data structure.
Two-way
	The relationship is visible to both sides of the relationship. This is similar to a graph data structure.
Types

Appwrite provides four different relationship types to enforce different associative rules between rows.
Type	Description
One-to-one
	A row can only be related to one and only one row.
One-to-many
	A row can be related to many other rows.
Many-to-one
	Many rows can be related to a single row.
Many-to-many
	A row can be related to many other rows.
On-delete

Appwrite also allows you to define the behavior of a relationship when a row is deleted.
Type	Description
Restrict
	If a row has at least one related row, it cannot be deleted.
Cascade
	If a row has related rows, when it is deleted, the related rows are also deleted.
Set null
	If a row has related rows, when it is deleted, the related rows are kept with their relationship column set to null.
Creating relationships

You can define relationships in the Appwrite Console, or using a Server SDK

You can create relationships in the Appwrite Console by adding a relationship column to a table.

    In your project, navigate to Databases > Select your database > Select your table > Columns > Create column.
    Select Relationship as the column type.
    In the Relationship modal, select the relationship type and pick the related table and columns.
    Pick relationship column key(s) to represent the related table. Relationship column keys are used to reference the related table in queries, so pick something that's intuitive and easy to remember.
    Select desired on delete behavior.
    Click the Create button to create the relationship.

Creating rows

If a table has relationship columns, you can create rows in two ways. You create both parent and child at the same time using a nested syntax or link parent and child rows through references*.

You can create both the parent and child at once in a relationship by nesting data.

const { Client, ID, TablesDB } = require('node-appwrite');

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>');               // Your project ID

const tablesDB = new TablesDB(client);

await tablesDB.createRow(
    'marvel',
    'movies',
    ID.unique(),
    {
        title: 'Spiderman',
        year: 2002,
        reviews: [
            { author: 'Bob', text: 'Great movie!' },
            { author: 'Alice', text: 'Loved it!' }
        ]
    }
)

Edge case behaviors

    If a nested child row is included and no child row ID is provided, the child row will be given a unique ID.
    If a nested child row is included and no conflicting child row ID exists, the child row will be created.
    If a nested child row is included and the child row ID already exists, the child row will be updated.

Queries

Queries are currently not available in the experimental version of Appwrite Relationships but will be added in a later version.
Update Relationships

Relationships can be updated by updating the relationship column.

const { Client, TablesDB } = require('node-appwrite');

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>');               // Your project ID

const tablesDB = new TablesDB(client);

await tablesDB.updateRow(
    'marvel',
    'movies',
    'spiderman',
    {
        title: 'Spiderman',
        year: 2002,
        reviews: [
            'review4',
            'review5'
        ]
    }
);

Delete relationships
Unlink relationships, retain rows

If you need to unlink rows in a relationship but retain the rows, you can do this by updating the relationship column and removing the ID of the related row.

If a row can be related to only one row, you can delete the relationship by setting the relationship column to null.

If a row can be related to more than one row, you can delete the relationship by setting the relationship column to an empty list.
Delete relationships and rows

If you need to delete the rows as well as unlink the relationship, the approach depends on the on-delete behavior of a relationship.

If the on-delete behavior is restrict, the link between the rows needs to be deleted first before the rows can be deleted individually.

If the on-delete behavior is set null, deleting a row will leave related rows in place with their relationship column set to null. If you wish to also delete related rows, they must be deleted individually.

If the on-delete behavior is cascade, deleting the parent rows also deletes related child rows, except for many-to-one relationships. In many-to-one relationships, there are multiple parent rows related to a single child row, and when the child row is deleted, the parents are deleted in cascade.

const { Client, TablesDB } = require('node-appwrite');

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>');               // Your project ID

const tablesDB = new TablesDB(client);

await tablesDB.deleteRow(
    'marvel',
    'movies',
    'spiderman'
);

Permissions

To access rows in a relationship, you must have permission to access both the parent and child rows.

When creating both the parent and child rows, the child row will inherit permissions from its parent.

You can also provide explicit permissions to the child row if they should be different from their parent.

const { Client, ID, TablesDB } = require('node-appwrite');

const client = new Client()
    .setEndpoint('https://<REGION>.cloud.appwrite.io/v1') // Your API Endpoint
    .setProject('<PROJECT_ID>');               // Your project ID

const tablesDB = new TablesDB(client);

await tablesDB.createRow(
    'marvel',
    'movies',
    ID.unique(),
    {
        title: 'Spiderman',
        year: 2002,
        reviews: [
            { 
                author: 'Bob', 
                text: 'Great movie!',
                $permissions: [
                    Permission.read(Role.any())
                ]
            },
        ]
    }
);

When creating, updating, or deleting in a relationship, you must have permission to access all rows referenced. If the user does not have read permission to any row, an exception will be thrown.
Limitations

Relationships can be nested between tables, but are restricted to a max depth of three levels. Relationship column key, type, and directionality can't be updated. On-delete behavior is the only option that can be updated for relationship columns.


Backups

Appwrite Backups enable seamless, encrypted database backups on Cloud. All backups are hot backups, ensuring zero downtime and fast recovery. Learn how to efficiently back up your databases to ensure data security and smooth recovery.
Backups are available on Appwrite Cloud for all Pro, Scale, and Enterprise customers.

Appwrite Backups allow you to automate database backups using backup policies, supporting pre-defined, custom retention & other options. You can also create manual backups whenever necessary.
Backup policies

Backup policies allow you to automate your backup process. The Scale and Enterprise plans allow for more customization and offer options like how often backups should occur, how long they should be retained, and when they should run.
Creating a backup policy

To automate your database backups, you need to create backup policies that run at scheduled intervals.

Create databases screen

    In the Appwrite Console's sidebar, click Databases

    Create or select & navigate to your database and click on the Backups Tab

    Click on Create Policies & select a pre-defined policy
     
        On a Pro plan, you get access to a Daily backup policy

    Pro plan policy

    On Scale and Enterprise plans, you get access to more & custom policies
     
        Select a pre-defined policy

        Scale plan policies

Or create a custom policy and adjust the settings as you like

Custom policies for Scale plan

    Click on Create

Your database is now set up for automated backups with just a few clicks. Note that you can always navigate to the same tab and click Create Manual to create a backup on-demand.
Manual backups

You can always create an on-demand backup whenever necessary.

Manual backup

    In the Appwrite Console's sidebar, click Databases
    Select & navigate to your database and click on the Backups Tab
    Click on Manual Backup

Depending on the size of your database, the backup process may take some time to complete. You can monitor its progress via the floating status bar at the bottom of your screen.
Restoring backups

To restore a database, you must have a backup of the database you want to restore.

Restore databases

    In the Appwrite Console's sidebar, click Databases
    Select & navigate to your database and click on the Backups Tab
    Click on the options menu in the far corner of your backup
    In the dropdown menu, click Restore.
    Enter the new database name and an optional database ID
    Click Restore

Depending on the size of your database, the restoration process may take some time. You can observe its status in a floating bar across your project.
Backup security & performance

All backups created with Appwrite are:

    Encrypted: All backups are securely encrypted to ensure your data remains protected at all times.

    Remotely stored: Backups are stored in a remote location, providing an additional layer of security and ensuring your data is always recoverable.

    Hot backups: Backups are hot, meaning they occur with zero downtime, allowing you to recover data quickly without interrupting your projects and services.

Best practices

To ensure your backups are robust and effective, consider the following best practices:

    Schedule regular backups: Add multiple backup policies based on the frequency of database changes. Daily or weekly backups are often sufficient for most use cases.

    Retain critical backups longer: Use custom policies with longer retention to keep backups of critical data for extended periods, ensuring historical records are available when needed.

    Optimize backup policies based on data sensitivity: Tailor your backup frequency and retention settings according to the sensitivity and importance of the data. Critical data may require more frequent backups, while less essential data can have longer retention and fewer backups.