Our current database schema is as follows:

Two databases (in order to avoid free plan index limits): main, main-2

main is structured as follows:
    boards - $id, board_name, email, $createdAt, $updatedAt
        indexes: boards_id_updatedAt ($id, $updatedAt)

    folders - $id, board_id, title, position,files, z-index, $createdAt, $updatedAt
        indexes: folders_board_id_updatedAt (
        board_id, $updatedAt)

    files - $id, folder_id, title, content, type,$createdAt, $updatedAt
        indexes: files_folder_id (folder_id), files_board_id_updatedAt (folder_id, $updatedAt)
    canvasHeaders (work in progress)
    drawingPaths (work in progress)

main-2 is structured as follows:
    bookmarks - (work in progress)


Our database does NOT have user_id fields. Instead we use appwrite to set user permissions on written documents and use those user permissions to identify the user.

All attributes set permissions as follows: Users: Create, Read, Update, Delete as true.

All row permissions are expected to be set to read, update, delete as true with the role: as the user $id.