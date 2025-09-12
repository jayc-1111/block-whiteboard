Our current database schema is as follows:

project id:68b6ed180029c5632ed3
api endpoint: https://sfo.cloud.appwrite.io/v1

Two databases (in order to avoid free plan index limits): main (database id:68b6f1aa003a536da72d), main-2 (database id:68bd70bc003176578fec)

main is structured as follows:
    boards - $id, board_name, email,$createdAt, $updatedAt
        indexes: boards_id_updatedAt ($id, $updatedAt).

    folders - $id, board_id, title, position,files, z-index, $createdAt, $updatedAt.
        indexes: folders_board_id_updatedAt (
        board_id, $updatedAt).

    files - $id, folder_id, title, content, type,$createdAt, $updatedAt.
        indexes: files_folder_id (folder_id), files_board_id_updatedAt (folder_id, $updatedAt).

    canvasHeaders (work in progress).

    drawingPaths (work in progress).

main-2 is structured as follows:
    bookmarks - (work in progress).
    settings - $id, dev_mode, onboarding, $createdAt, $updatedAt.

Our database does NOT have user_id fields. Instead we use appwrite to set user permissions on written documents and use those user permissions to identify the user.

All attributes set permissions as follows: Users: Create, Read, Update, Delete as true.

All row permissions are expected to be set to read, update, delete as true with the role: as the user $id.

Our app has a cloud-first approach. Local storage is not to be used unless absolutely needed.

