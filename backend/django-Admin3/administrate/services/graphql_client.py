from gql import Client, gql
from gql.transport.requests import RequestsHTTPTransport
from django.conf import settings


class AdministrateGraphQLClient:
    def __init__(self):
        self.transport = RequestsHTTPTransport(
            url=settings.ADMINISTRATE_API_URL,
            headers={
                'Authorization': f'Bearer {settings.ADMINISTRATE_API_KEY}',
                'Content-Type': 'application/json',
            },
        )
        self.client = Client(
            transport=self.transport,
            fetch_schema_from_transport=True
        )

    def execute_query(self, query_path, variables=None):
        with open(query_path) as f:
            query_string = f.read()
        query = gql(query_string)
        return self.client.execute(query, variable_values=variables)
