class AppError(Exception):
    def __init__(self, message: str) -> None:
        self.message = message
        super().__init__(message)


class InvalidUrlError(AppError):
    pass


class InvalidPathError(AppError):
    pass


class VideoNotFoundError(AppError):
    pass


class DownloadFailedError(AppError):
    pass


class PreviewFailedError(AppError):
    pass
